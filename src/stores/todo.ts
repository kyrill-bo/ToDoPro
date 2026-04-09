import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Project, Board, Column, Card } from '@/types'

export const useTodoStore = defineStore('todo', () => {
  const projects = ref<Project[]>([])
  const boards = ref<Board[]>([])
  const isInitialLoad = ref(true)

  const isElectron = !!(window as any).ipcRenderer || (!!(window as any).require && !!(window as any).require('electron'))

  const loadData = async () => {
    isInitialLoad.value = true
    console.log('Starting data synchronization...')
    
    if (isElectron) {
      try {
        const data = await (window as any).ipcRenderer.invoke('get-data')
        if (data) {
          projects.value = data.projects || []
          boards.value = data.boards || []
          console.log('Electron DB synced successfully.')
        }
      } catch (e) {
        console.error('Failed to load from Electron:', e)
      }
    } else {
      const data = localStorage.getItem('todo-pro-data')
      if (data) {
        const parsed = JSON.parse(data)
        projects.value = parsed.projects || []
        boards.value = parsed.boards || []
      }
    }
    
    // Crucial: Wait for reactive system to settle before enabling save
    setTimeout(() => {
      isInitialLoad.value = false
      console.log('Save-monitor active.')
    }, 500)
  }

  const saveData = async () => {
    if (isInitialLoad.value) return

    const data = {
      projects: projects.value,
      boards: boards.value
    }

    if (isElectron) {
      try {
        await (window as any).ipcRenderer.invoke('save-data', JSON.parse(JSON.stringify(data)))
      } catch (e) {
        console.error('Failed to save to Electron:', e)
      }
    } else {
      localStorage.setItem('todo-pro-data', JSON.stringify(data))
    }
  }

  watch([projects, boards], () => {
    saveData()
  }, { deep: true })

  // ACTIONS
  const addProject = (title: string, description: string) => {
    projects.value.push({ id: crypto.randomUUID(), title, description, createdAt: Date.now() })
  }

  const updateProject = (id: string, updates: Partial<Project>) => {
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) projects.value[index] = { ...projects.value[index], ...updates }
  }

  const deleteProject = (id: string) => {
    projects.value = projects.value.filter(p => p.id !== id)
    boards.value = boards.value.filter(b => b.projectId !== id)
  }

  const addBoard = (projectId: string, title: string) => {
    boards.value.push({
      id: crypto.randomUUID(),
      projectId,
      title,
      columns: [
        { id: crypto.randomUUID(), title: 'To Do', cards: [] },
        { id: crypto.randomUUID(), title: 'In Progress', cards: [] },
        { id: crypto.randomUUID(), title: 'Done', cards: [] }
      ]
    })
  }

  const updateBoard = (id: string, title: string) => {
    const board = boards.value.find(b => b.id === id)
    if (board) board.title = title
  }

  const deleteBoard = (id: string) => {
    boards.value = boards.value.filter(b => b.id !== id)
  }

  const addColumn = (boardId: string, title: string) => {
    const board = boards.value.find(b => b.id === boardId)
    if (board) board.columns.push({ id: crypto.randomUUID(), title, cards: [] })
  }

  const updateColumn = (boardId: string, columnId: string, title: string) => {
    const board = boards.value.find(b => b.id === boardId)
    if (board) {
      const column = board.columns.find(c => c.id === columnId)
      if (column) column.title = title
    }
  }

  const deleteColumn = (boardId: string, columnId: string) => {
    const board = boards.value.find(b => b.id === boardId)
    if (board) board.columns = board.columns.filter(c => c.id !== columnId)
  }

  const addCard = (boardId: string, columnId: string, title: string) => {
    const board = boards.value.find(b => b.id === boardId)
    if (board) {
      const column = board.columns.find(c => c.id === columnId)
      if (column) {
        column.cards.push({
          id: crypto.randomUUID(),
          title,
          description: '',
          color: 'transparent',
          tags: [],
          checklists: [],
          comments: [],
          createdAt: Date.now()
        })
      }
    }
  }

  const updateCard = (boardId: string, columnId: string, cardId: string, updates: Partial<Card>) => {
    const board = boards.value.find(b => b.id === boardId)
    if (board) {
      const column = board.columns.find(c => c.id === columnId)
      if (column) {
        const index = column.cards.findIndex(c => c.id === cardId)
        if (index !== -1) column.cards[index] = { ...column.cards[index], ...updates }
      }
    }
  }

  const deleteCard = (boardId: string, columnId: string, cardId: string) => {
    const board = boards.value.find(b => b.id === boardId)
    if (board) {
      const column = board.columns.find(c => c.id === columnId)
      if (column) column.cards = column.cards.filter(c => c.id !== cardId)
    }
  }

  const addComment = (boardId: string, columnId: string, cardId: string, text: string) => {
    const board = boards.value.find(b => b.id === boardId)
    if (board) {
      const column = board.columns.find(c => c.id === columnId)
      if (column) {
        const card = column.cards.find(c => c.id === cardId)
        if (card) card.comments.push({ id: crypto.randomUUID(), text, createdAt: Date.now() })
      }
    }
  }

  const getBoardsByProject = (projectId: string) => boards.value.filter(b => b.projectId === projectId)
  const getBoardById = (id: string) => boards.value.find(b => b.id === id)

  const importData = (data: { projects: Project[], boards: Board[] }) => {
    isInitialLoad.value = true
    projects.value = data.projects
    boards.value = data.boards
    setTimeout(() => {
      isInitialLoad.value = false
      saveData()
    }, 500)
  }

  const clearData = () => {
    isInitialLoad.value = true
    projects.value = []
    boards.value = []
    setTimeout(() => {
      isInitialLoad.value = false
      saveData()
    }, 100)
  }

  loadData()

  return {
    projects, boards, addProject, updateProject, deleteProject,
    addBoard, updateBoard, deleteBoard, addColumn, updateColumn, deleteColumn,
    addCard, updateCard, deleteCard, addComment, getBoardsByProject, getBoardById,
    importData, loadData, clearData
  }
})
