import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Project, Board, Card, AppState } from '@/types'

export const useTodoStore = defineStore('todo', () => {
  const projects = ref<Project[]>([])
  const boards = ref<Board[]>([])
  const isInitialLoad = ref(true)

  const CURRENT_DB_VERSION = 2

  const migrateData = (data: any): AppState => {
    let version = data.version || 0
    const projects = data.projects || []
    const boards = data.boards || []

    if (version < 1) {
      console.log('Migrating DB to version 1...')
      const now = Date.now()
      boards.forEach((board: any) => {
        board.columns?.forEach((column: any) => {
          column.cards?.forEach((card: any) => {
            if (!card.createdAt) card.createdAt = now
            if (!card.logs) {
              card.logs = [
                {
                  id: crypto.randomUUID(),
                  type: 'create',
                  createdAt: card.createdAt,
                  toColumn: column.title
                }
              ]
            }
          })
        })
      })
      version = 1
    }

    if (version < 2) {
      console.log('Migrating DB to version 2 (Attachments)...')
      boards.forEach((board: any) => {
        board.columns?.forEach((column: any) => {
          column.cards?.forEach((card: any) => {
            if (!card.attachments) card.attachments = []
          })
        })
      })
      version = 2
    }

    return { version, projects, boards }
  }

  const getIpcRenderer = () => {
    const w = window as any
    if (w.ipcRenderer) return w.ipcRenderer
    if (w.require) {
      try {
        return w.require('electron').ipcRenderer
      } catch {
        return null
      }
    }
    return null
  }

  const isElectron = !!getIpcRenderer()
  const API_BASE_URL = 'http://localhost:3001/api'

  const loadFromApi = async () => {
    const response = await fetch(`${API_BASE_URL}/data`)
    if (!response.ok) throw new Error(`API load failed with status ${response.status}`)
    return response.json()
  }

  const saveToApi = async (data: AppState) => {
    const response = await fetch(`${API_BASE_URL}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) throw new Error(`API save failed with status ${response.status}`)
  }

  const loadData = async () => {
    isInitialLoad.value = true
    console.log('Starting data synchronization...')
    
    if (isElectron) {
      try {
        const ipcRenderer = getIpcRenderer()
        const data = ipcRenderer ? await ipcRenderer.invoke('get-data') : null
        if (data) {
          const migrated = migrateData(data)
          projects.value = migrated.projects
          boards.value = migrated.boards
          console.log('Electron DB synced successfully.')
        }
      } catch (e) {
        console.error('Failed to load from Electron:', e)
      }
    } else {
      try {
        const data = await loadFromApi()
        const migrated = migrateData(data)
        projects.value = migrated.projects
        boards.value = migrated.boards
        console.log('Server DB synced successfully.')
      } catch (e) {
        console.warn('Failed to load from local API, using localStorage fallback:', e)
        const data = localStorage.getItem('todo-pro-data')
        if (data) {
          const parsed = JSON.parse(data)
          const migrated = migrateData(parsed)
          projects.value = migrated.projects
          boards.value = migrated.boards
        }
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

    const data: AppState = {
      version: CURRENT_DB_VERSION,
      projects: projects.value,
      boards: boards.value
    }

    if (isElectron) {
      try {
        const ipcRenderer = getIpcRenderer()
        if (ipcRenderer) {
          await ipcRenderer.invoke('save-data', JSON.parse(JSON.stringify(data)))
        }
      } catch (e) {
        console.error('Failed to save to Electron:', e)
      }
    } else {
      try {
        await saveToApi(data)
      } catch (e) {
        console.warn('Failed to save to local API, using localStorage fallback:', e)
        localStorage.setItem('todo-pro-data', JSON.stringify(data))
      }
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
        const now = Date.now()
        column.cards.push({
          id: crypto.randomUUID(),
          title,
          description: '',
          color: 'transparent',
          tags: [],
          checklists: [],
          comments: [],
          attachments: [],
          logs: [
            {
              id: crypto.randomUUID(),
              type: 'create',
              createdAt: now,
              toColumn: column.title
            }
          ],
          createdAt: now
        })
      }
    }
  }

  const logActivity = (boardId: string, cardId: string, type: 'move' | 'create', fromColumn?: string, toColumn?: string) => {
    const board = boards.value.find(b => b.id === boardId)
    if (board) {
      for (const column of board.columns) {
        const card = column.cards.find(c => c.id === cardId)
        if (card) {
          if (!card.logs) card.logs = []
          card.logs.push({
            id: crypto.randomUUID(),
            type,
            fromColumn,
            toColumn,
            createdAt: Date.now()
          })
          break
        }
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

  const addAttachment = (boardId: string, columnId: string, cardId: string, file: { name: string, url: string, type: string, size: number }) => {
    const board = boards.value.find(b => b.id === boardId)
    if (board) {
      const column = board.columns.find(c => c.id === columnId)
      if (column) {
        const card = column.cards.find(c => c.id === cardId)
        if (card) {
          if (!card.attachments) card.attachments = []
          card.attachments.push({
            id: crypto.randomUUID(),
            ...file,
            createdAt: Date.now()
          })
        }
      }
    }
  }

  const deleteAttachment = (boardId: string, columnId: string, cardId: string, attachmentId: string) => {
    const board = boards.value.find(b => b.id === boardId)
    if (board) {
      const column = board.columns.find(c => c.id === columnId)
      if (column) {
        const card = column.cards.find(c => c.id === cardId)
        if (card) {
          card.attachments = card.attachments.filter(a => a.id !== attachmentId)
        }
      }
    }
  }

  const getBoardsByProject = (projectId: string) => boards.value.filter(b => b.projectId === projectId)
  const getBoardById = (id: string) => boards.value.find(b => b.id === id)

  const importData = (data: any) => {
    isInitialLoad.value = true
    const migrated = migrateData(data)
    projects.value = migrated.projects
    boards.value = migrated.boards
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
    addCard, updateCard, deleteCard, addComment, addAttachment, deleteAttachment, logActivity, getBoardsByProject, getBoardById,
    importData, loadData, clearData
  }
})
