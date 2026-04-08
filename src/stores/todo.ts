import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { Project, Board, Card } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && 
                   (window as any).process && 
                   (window as any).process.type === 'renderer';

export const useTodoStore = defineStore('todo', () => {
  const projects = ref<Project[]>([]);
  const boards = ref<Board[]>([]);
  const isLoading = ref(true);
  let isInitialLoad = true;

  // Load from File (API or Electron IPC)
  async function loadData() {
    try {
      isLoading.value = true;
      let data;
      
      if (isElectron) {
        // Direct file access via Electron IPC
        const { ipcRenderer } = (window as any).require('electron');
        data = await ipcRenderer.invoke('get-data');
      } else {
        // Fallback to Express Server API
        const res = await fetch('/api/data');
        data = await res.json();
      }
      
      projects.value = data.projects || [];
      boards.value = data.boards || [];
      
      if (projects.value.length === 0) {
        initSampleData();
      }
      
      setTimeout(() => {
        isInitialLoad = false;
      }, 500);
    } catch (error) {
      console.error('Failed to load data:', error);
      isInitialLoad = false;
    } finally {
      isLoading.value = false;
    }
  }

  // Save to File (API or Electron IPC)
  async function saveData() {
    if (isInitialLoad) return;
    try {
      const payload = {
        projects: projects.value,
        boards: boards.value
      };

      if (isElectron) {
        const { ipcRenderer } = (window as any).require('electron');
        await ipcRenderer.invoke('save-data', payload);
      } else {
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  // Persist on changes
  watch([projects, boards], () => {
    saveData();
  }, { deep: true });

  // Initial load
  loadData();

  // Project Actions
  function addProject(title: string, description?: string) {
    const newProject: Project = {
      id: crypto.randomUUID(),
      title,
      description,
      createdAt: Date.now(),
    };
    projects.value.push(newProject);
    return newProject;
  }

  function deleteProject(id: string) {
    projects.value = projects.value.filter(p => p.id !== id);
    boards.value = boards.value.filter(b => b.projectId !== id);
  }

  function updateProject(id: string, updates: Partial<Project>) {
    const project = projects.value.find(p => p.id === id);
    if (project) {
      Object.assign(project, updates);
    }
  }

  // Board Actions
  function addBoard(projectId: string, title: string) {
    const newBoard: Board = {
      id: crypto.randomUUID(),
      title,
      projectId,
      columns: [
        { id: crypto.randomUUID(), title: 'To Do', cards: [] },
        { id: crypto.randomUUID(), title: 'In Progress', cards: [] },
        { id: crypto.randomUUID(), title: 'Done', cards: [] },
      ],
    };
    boards.value.push(newBoard);
    return newBoard;
  }

  function deleteBoard(id: string) {
    boards.value = boards.value.filter(b => b.id !== id);
  }

  function getBoardById(id: string) {
    return boards.value.find(b => b.id === id);
  }

  function getBoardsByProject(projectId: string) {
    return boards.value.filter(b => b.projectId === projectId);
  }

  // Column Actions
  function addColumn(boardId: string, title: string) {
    const board = getBoardById(boardId);
    if (board) {
      board.columns.push({
        id: crypto.randomUUID(),
        title,
        cards: [],
      });
    }
  }

  function deleteColumn(boardId: string, columnId: string) {
    const board = getBoardById(boardId);
    if (board) {
      board.columns = board.columns.filter(c => c.id !== columnId);
    }
  }

  function updateColumn(boardId: string, columnId: string, title: string) {
    const board = getBoardById(boardId);
    if (board) {
      const column = board.columns.find(c => c.id === columnId);
      if (column) {
        column.title = title;
      }
    }
  }

  // Card Actions
  function addCard(boardId: string, columnId: string, title: string, description?: string) {
    const board = getBoardById(boardId);
    if (board) {
      const column = board.columns.find(c => c.id === columnId);
      if (column) {
        column.cards.push({
          id: crypto.randomUUID(),
          title,
          description,
          comments: [],
          color: 'transparent',
          createdAt: Date.now(),
        });
      }
    }
  }

  function updateCard(boardId: string, columnId: string, cardId: string, updates: Partial<Card>) {
    const board = getBoardById(boardId);
    if (board) {
      const column = board.columns.find(c => c.id === columnId);
      if (column) {
        const card = column.cards.find(c => c.id === cardId);
        if (card) {
          Object.assign(card, updates);
        }
      }
    }
  }

  function addComment(boardId: string, columnId: string, cardId: string, text: string) {
    const board = getBoardById(boardId);
    if (board) {
      const column = board.columns.find(c => c.id === columnId);
      if (column) {
        const card = column.cards.find(c => c.id === cardId);
        if (card) {
          card.comments.push({
            id: crypto.randomUUID(),
            text,
            createdAt: Date.now()
          });
        }
      }
    }
  }

  function deleteCard(boardId: string, columnId: string, cardId: string) {
    const board = getBoardById(boardId);
    if (board) {
      const column = board.columns.find(c => c.id === columnId);
      if (column) {
        column.cards = column.cards.filter(c => c.id !== cardId);
      }
    }
  }

  function initSampleData() {
    const p1 = addProject('Willkommen!', 'Dies ist deine neue ToDo App.');
    const b1 = addBoard(p1.id, 'Mein erstes Board');
    addCard(b1.id, b1.columns[0].id, 'Entdecke die Features');
    addCard(b1.id, b1.columns[0].id, 'Bearbeite Projekte und Spalten');
    addCard(b1.id, b1.columns[1].id, 'Viel Erfolg!');
  }

  function importData(data: { projects: Project[], boards: Board[] }) {
    projects.value = data.projects || [];
    boards.value = data.boards || [];
  }

  return {
    projects,
    boards,
    isLoading,
    addProject,
    deleteProject,
    updateProject,
    addBoard,
    deleteBoard,
    getBoardById,
    getBoardsByProject,
    addColumn,
    deleteColumn,
    updateColumn,
    addCard,
    updateCard,
    addComment,
    deleteCard,
    importData,
  };
});
