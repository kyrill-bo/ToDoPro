<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useTodoStore } from '@/stores/todo'
import draggable from 'vuedraggable'
import { 
  Plus, 
  MoreVertical, 
  Trash2, 
  MessageSquare, 
  Calendar,
  Type,
  AlignLeft,
  GripVertical,
  CheckSquare,
  Tag as TagIcon,
  Check,
  X,
  Clock,
  Palette,
  Terminal,
  Cpu,
  Activity,
  Database,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Bold,
  Italic,
  List as ListIcon,
  Code as CodeIcon,
  Heading
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { VisuallyHidden } from 'reka-ui'
import { marked } from 'marked'
import type { Card as CardType, Tag } from '@/types'

const props = defineProps<{
  boardId: string
}>()

const store = useTodoStore()
const board = computed(() => store.getBoardById(props.boardId))

// --- UI STATES (Accordion Behavior) ---
const activeSection = ref<'parameters' | 'checklist' | 'activity'>('activity')

// State for adding/editing
const newColumnTitle = ref('')
const isAddingColumn = ref(false)
const newCardTitle = ref<Record<string, string>>({})
const isAddingCard = ref<Record<string, boolean>>({})
const editingColumnId = ref<string | null>(null)
const editingColumnTitle = ref('')

const selectedCard = ref<CardType | null>(null)
const selectedCardColumnId = ref<string | null>(null)
const isCardDetailOpen = ref(false)
const commentText = ref('')
const newChecklistItem = ref('')
const newTagText = ref('')
const selectedTagColor = ref('#ffffff')

// --- MARKDOWN PREVIEW ---
const isEditingDescription = ref(false)
const renderedDescription = computed(() => {
  if (!selectedCard.value?.description) return '<span class="opacity-20 italic">Keine Beschreibung vorhanden. Klicke zum Bearbeiten...</span>'
  return marked(selectedCard.value.description)
})

const startEditingDescription = async (e: MouseEvent) => {
  // Prevent edit mode if clicking on a link
  const target = e.target as HTMLElement
  if (target.tagName === 'A') return

  isEditingDescription.value = true
  await nextTick()
  const textarea = document.querySelector('.description-textarea') as HTMLTextAreaElement
  textarea?.focus()
}

const applyMarkdown = (prefix: string, suffix: string = '') => {
  if (!selectedCard.value) return
  const textarea = document.querySelector('.description-textarea') as HTMLTextAreaElement
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = selectedCard.value.description || ''
  const selectedText = text.substring(start, end)
  
  const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end)
  selectedCard.value.description = newText
  
  // Refocus and set selection
  nextTick(() => {
    textarea.focus()
    const newPos = start + prefix.length + selectedText.length + suffix.length
    textarea.setSelectionRange(newPos, newPos)
  })
}

// --- AUTO-SAVE ON CLOSE ---
watch(isCardDetailOpen, (newVal) => {
  if (!newVal && selectedCard.value && selectedCardColumnId.value) {
    store.updateCard(props.boardId, selectedCardColumnId.value, selectedCard.value.id, selectedCard.value)
  }
})

// --- PANNING ---
const viewportRef = ref<HTMLElement | null>(null)
const isPanning = ref(false)
const startX = ref(0)
const scrollLeftStart = ref(0)

const onMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('.card-item') || target.closest('.column-handle') || target.closest('.dropdown-trigger')) return
  if (viewportRef.value) {
    isPanning.value = true
    startX.value = e.pageX - viewportRef.value.offsetLeft
    scrollLeftStart.value = viewportRef.value.scrollLeft
    viewportRef.value.style.cursor = 'grabbing'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopPanning)
  }
}

const onMouseMove = (e: MouseEvent) => {
  if (!isPanning.value || !viewportRef.value) return
  e.preventDefault()
  const x = e.pageX - viewportRef.value.offsetLeft
  const walk = (x - startX.value) * 1.5 
  viewportRef.value.scrollLeft = scrollLeftStart.value - walk
}

const stopPanning = () => {
  isPanning.value = false
  if (viewportRef.value) viewportRef.value.style.cursor = 'grab'
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopPanning)
}

// --- SHORTCUTS ---
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
    if (isInput && e.key !== 'Escape') return
    
    if (isCardDetailOpen.value) {
      if (e.key === 'Escape') isCardDetailOpen.value = false
      if (e.key === '1') activeSection.value = 'parameters'
      if (e.key === '2') activeSection.value = 'checklist'
      if (e.key === '3') activeSection.value = 'activity'
    } else {
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        if (board.value?.columns.length) isAddingCard.value[board.value.columns[0].id] = true
      }
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))
})

// Actions
const handleAddColumn = () => {
  if (!newColumnTitle.value) return
  store.addColumn(props.boardId, newColumnTitle.value)
  newColumnTitle.value = ''
  isAddingColumn.value = false
}

const handleAddCard = (columnId: string) => {
  const title = newCardTitle.value[columnId]
  if (!title) return
  store.addCard(props.boardId, columnId, title)
  newCardTitle.value[columnId] = ''
  isAddingCard.value[columnId] = false
}

const saveColumnTitle = (columnId: string) => {
  if (editingColumnTitle.value) store.updateColumn(props.boardId, columnId, editingColumnTitle.value)
  editingColumnId.value = null
}

const openCardDetail = (card: CardType, columnId: string) => {
  selectedCard.value = JSON.parse(JSON.stringify(card))
  selectedCardColumnId.value = columnId
  isCardDetailOpen.value = true
}

const handleAddComment = () => {
  if (commentText.value && selectedCard.value && selectedCardColumnId.value) {
    store.addComment(props.boardId, selectedCardColumnId.value, selectedCard.value.id, commentText.value)
    selectedCard.value.comments.push({ id: crypto.randomUUID(), text: commentText.value, createdAt: Date.now() })
    commentText.value = ''
  }
}

const addChecklistItem = () => {
  if (newChecklistItem.value && selectedCard.value) {
    selectedCard.value.checklists.push({ id: crypto.randomUUID(), text: newChecklistItem.value, completed: false })
    newChecklistItem.value = ''
  }
}

const removeChecklistItem = (id: string) => {
  if (selectedCard.value) selectedCard.value.checklists = selectedCard.value.checklists.filter(i => i.id !== id)
}

const addTag = () => {
  if (newTagText.value && selectedCard.value) {
    selectedCard.value.tags.push({
      id: crypto.randomUUID(),
      text: newTagText.value,
      color: selectedTagColor.value
    })
    newTagText.value = ''
  }
}

const removeTag = (tagId: string) => {
  if (selectedCard.value) {
    selectedCard.value.tags = selectedCard.value.tags.filter(t => t.id !== tagId)
  }
}

const getChecklistProgress = (card: CardType) => {
  if (!card.checklists?.length) return null
  const completed = card.checklists.filter(i => i.completed).length
  return { completed, total: card.checklists.length }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const colors = [
  { name: 'Default', value: 'transparent', hex: '#111111' },
  { name: 'White', value: '#ffffff', hex: '#FFFFFF' },
  { name: 'Cyber Blue', value: '#0ea5e9', hex: '#0EA5E9' },
  { name: 'Neon Purple', value: '#a855f7', hex: '#A855F7' },
  { name: 'Matrix Green', value: '#10b981', hex: '#10B981' },
  { name: 'Laser Red', value: '#ef4444', hex: '#EF4444' },
  { name: 'Gold', value: '#f59e0b', hex: '#F59E0B' },
  { name: 'Pink', value: '#ec4899', hex: '#EC4899' },
  { name: 'Orange', value: '#f97316', hex: '#F97316' },
  { name: 'Lime', value: '#84cc16', hex: '#84CC16' },
  { name: 'Teal', value: '#14b8a6', hex: '#14B8A6' },
  { name: 'Indigo', value: '#6366f1', hex: '#6366F1' },
]

const tagColors = ['#ffffff', '#0ea5e9', '#a855f7', '#10b981', '#ef4444', '#f59e0b']

const vFocus = {
  mounted: (el: HTMLElement) => {
    const input = el.tagName === 'INPUT' ? el : el.querySelector('input')
    input?.focus()
  }
}
</script>

<template>
  <div v-if="board" class="h-full w-full relative overflow-hidden flex flex-col">
    <!-- Panning Viewport -->
    <div ref="viewportRef" class="flex-1 overflow-x-auto overflow-y-hidden cursor-grab select-none p-6" @mousedown="onMouseDown">
      <div class="flex items-start h-full min-w-full w-max gap-6">
        <!-- Draggable Rails (Columns) -->
        <draggable v-model="board.columns" group="columns" item-key="id" handle=".column-handle" class="flex gap-6 h-full items-start" ghost-class="opacity-50">
          <template #item="{ element: column }">
            <div class="w-72 flex-shrink-0 flex flex-col bg-white/[0.05] border-x border-white/20 h-full relative group/rail shadow-2xl">
              <div class="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                <div class="h-full bg-white transition-all duration-700 ease-out" :style="{ width: Math.min(100, (column.cards.length / 10) * 100) + '%' }"></div>
              </div>
              <div class="p-4 flex items-start justify-between column-handle cursor-grab active:cursor-grabbing">
                <div class="space-y-1 flex-1 min-w-0">
                  <div class="flex items-center gap-2"><Database class="w-3 h-3 text-white/20" /><span class="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Sector_{{ column.id.slice(0,2).toUpperCase() }}</span></div>
                  <Input v-if="editingColumnId === column.id" v-model="editingColumnTitle" v-focus class="h-8 bg-white/5 border-white/20 text-sm font-black italic uppercase" @blur="saveColumnTitle(column.id)" @keyup.enter="saveColumnTitle(column.id)" @mousedown.stop />
                  <h3 v-else class="text-xl font-black italic uppercase tracking-tighter truncate cursor-pointer hover:text-white transition-colors" @mousedown.stop @click="editingColumnId = column.id; editingColumnTitle = column.title">{{ column.title }}</h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child class="dropdown-trigger"><Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-white/10 text-white/20 no-drag" @mousedown.stop><MoreVertical class="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="bg-black/95 backdrop-blur-xl border-white/10 text-white p-2">
                    <DropdownMenuItem class="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-md no-drag font-bold text-[10px] uppercase tracking-widest" @click="editingColumnId = column.id; editingColumnTitle = column.title"><Type class="w-4 h-4 mr-2" /> Umbenennen</DropdownMenuItem>
                    <DropdownMenuItem class="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-md no-drag font-bold text-[10px] uppercase tracking-widest" @click="store.deleteColumn(boardId, column.id)"><Trash2 class="w-4 h-4 mr-2" /> Spalte löschen</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <ScrollArea class="flex-1 px-3 py-2">
                <draggable v-model="column.cards" group="cards" item-key="id" class="space-y-3 min-h-[200px] pb-10" ghost-class="opacity-10">
                  <template #item="{ element: card }">
                    <div class="card-item group relative transition-all cursor-pointer overflow-hidden border-t border-white/20 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/40 active:scale-[0.98] pointer-events-auto p-3 space-y-3 shadow-lg" @click="openCardDetail(card, column.id)">
                      <div v-if="getChecklistProgress(card)" class="absolute top-0 left-0 w-full h-[1px] bg-white/5 overflow-hidden">
                        <div class="h-full bg-white opacity-60" :style="{ width: (getChecklistProgress(card)!.completed / getChecklistProgress(card)!.total * 100) + '%' }"></div>
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        <div v-for="tag in card.tags" :key="tag.id" class="px-2 py-0.5 rounded-[2px] text-[7px] font-black uppercase tracking-tighter border" :style="{ borderColor: tag.color + '40', color: tag.color, backgroundColor: tag.color + '10' }">{{ tag.text }}</div>
                      </div>
                      <p class="text-sm font-black italic uppercase leading-tight text-white/70 group-hover:text-white transition-colors tracking-tight">{{ card.title }}</p>
                      <p v-if="card.description" class="text-[10px] text-white/20 line-clamp-1 italic">{{ card.description }}</p>
                      <div class="flex items-center justify-between text-[9px] font-black text-white/20 uppercase tracking-widest pt-2">
                        <div class="flex items-center gap-3">
                          <div v-if="card.dueDate" class="flex items-center gap-1"><Calendar class="w-2.5 h-2.5" />{{ card.dueDate }}</div>
                          <div v-if="card.comments?.length" class="flex items-center gap-1"><MessageSquare class="w-2.5 h-2.5" />{{ card.comments.length }}</div>
                        </div>
                        <div v-if="getChecklistProgress(card)" class="text-white/40">{{ getChecklistProgress(card)?.completed }}/{{ getChecklistProgress(card)?.total }}</div>
                      </div>
                      <div class="absolute left-0 top-0 w-[2px] h-full" :style="{ backgroundColor: card.color !== 'transparent' ? card.color : 'transparent' }"></div>
                    </div>
                  </template>
                </draggable>
              </ScrollArea>
              <div class="p-4 border-t border-white/10 bg-black/20">
                <div v-if="isAddingCard[column.id]" class="space-y-3 p-2 bg-white/[0.02] rounded-xl border border-white/20 animate-in fade-in slide-in-from-bottom-2">
                  <Input v-model="newCardTitle[column.id]" v-focus placeholder="Initialize data..." class="bg-transparent border-none text-sm h-8 focus-visible:ring-0 font-mono" @keyup.enter="handleAddCard(column.id)" @mousedown.stop />
                  <div class="flex gap-2">
                    <Button size="sm" class="bg-white text-black font-black text-[10px] flex-1" @click="handleAddCard(column.id)">APPEND</Button>
                    <Button size="sm" variant="ghost" class="text-white/20 text-[10px]" @click="isAddingCard[column.id] = false">X</Button>
                  </div>
                </div>
                <button v-else class="w-full h-10 flex items-center justify-center gap-3 text-white/10 hover:text-white/40 hover:bg-white/[0.02] transition-all no-drag border border-dashed border-white/10 rounded-xl group/add" @click="isAddingCard[column.id] = true"><Plus class="w-4 h-4 group-hover/add:rotate-90 transition-transform" /><span class="text-[9px] font-black uppercase tracking-[0.3em]">Add_Entry</span></button>
              </div>
            </div>
          </template>
        </draggable>

        <div class="w-80 flex-shrink-0 h-full">
          <div v-if="isAddingColumn" class="bg-white/[0.03] border border-white/20 backdrop-blur-xl p-8 rounded-2xl space-y-6 animate-in zoom-in-95" @mousedown.stop>
            <div class="space-y-2"><span class="text-[8px] font-black text-white/20 uppercase tracking-widest">New_Sector_Link</span><Input v-model="newColumnTitle" v-focus placeholder="Enter Sector Name..." class="bg-white/5 border-white/20 h-12 text-xl font-black italic uppercase" @keyup.enter="handleAddColumn" /></div>
            <div class="flex gap-3"><Button class="bg-white text-black hover:bg-white/90 font-black flex-1 h-12 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]" @click="handleAddColumn">INITIALIZE</Button><Button variant="ghost" class="text-white/20 text-[10px] font-bold" @click="isAddingColumn = false">VOID</Button></div>
          </div>
          <button v-else class="w-full h-full border-x border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all no-drag flex flex-col items-center justify-center gap-6 group/ghost" @click="isAddingColumn = true"><div class="relative w-16 h-16 flex items-center justify-center"><div class="absolute inset-0 rounded-full border border-dashed border-white/10 group-hover/ghost:rotate-90 transition-transform duration-1000"></div><Plus class="w-6 h-6 text-white/5 group-hover/ghost:text-white/40 transition-colors" /></div><div class="flex flex-col items-center gap-1"><span class="text-[9px] font-black uppercase tracking-[0.4em] text-white/5 group-hover/ghost:text-white/20 transition-all">Ready_to_Link</span><span class="text-[11px] font-black uppercase italic tracking-tighter text-white/5 group-hover/ghost:text-white/10 transition-all">Append_New_Rail</span></div></button>
        </div>
      </div>
    </div>

    <!-- COMMAND CENTER CARD DETAIL -->
    <Dialog v-model:open="isCardDetailOpen">
      <DialogContent hide-close class="max-w-6xl h-[85vh] bg-[#050505] border border-white/20 text-white p-0 overflow-hidden z-[1000] flex flex-col rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,1)]">
        <VisuallyHidden>
          <DialogTitle>{{ selectedCard?.title }}</DialogTitle>
          <DialogDescription>Central Task Command Interface</DialogDescription>
        </VisuallyHidden>

        <div class="h-20 border-b border-white/10 bg-white/[0.02] flex items-center px-10 justify-between shrink-0">
          <div class="flex items-center gap-6 flex-1">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-xs shadow-[0_0_20px_rgba(255,255,255,0.2)]">CORE</div>
              <div class="flex flex-col">
                <span class="text-[8px] font-black text-white/20 uppercase tracking-[0.4em]">Unit_Established</span>
                <span class="text-[10px] font-mono text-green-500/60 uppercase">Link_Active</span>
              </div>
            </div>
            <Input v-if="selectedCard" v-model="selectedCard.title" v-focus class="text-3xl font-black italic uppercase bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-white tracking-tighter w-full placeholder:text-white/5" />
          </div>
          <Button variant="ghost" size="icon" class="w-12 h-12 rounded-full hover:bg-white/10 text-white/20 no-drag" @click="isCardDetailOpen = false">
            <X class="w-6 h-6" />
          </Button>
        </div>

        <div v-if="selectedCard" class="flex-1 flex overflow-hidden">
          <div class="flex-1 flex flex-col border-r border-white/10">
            <ScrollArea class="flex-1">
              <div class="p-10 space-y-8">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3 text-[10px] font-black text-white/30 tracking-[0.5em]">
                    <Terminal class="w-4 h-4" /> // BRAIN_DUMP
                  </div>
                  <div v-if="isEditingDescription" class="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                    <Button variant="ghost" size="icon" class="h-7 w-7 text-white/40 hover:text-white no-drag" @mousedown.prevent="applyMarkdown('# ', '')"><Heading class="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" class="h-7 w-7 text-white/40 hover:text-white no-drag" @mousedown.prevent="applyMarkdown('**', '**')"><Bold class="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" class="h-7 w-7 text-white/40 hover:text-white no-drag" @mousedown.prevent="applyMarkdown('_', '_')"><Italic class="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" class="h-7 w-7 text-white/40 hover:text-white no-drag" @mousedown.prevent="applyMarkdown('- ', '')"><ListIcon class="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" class="h-7 w-7 text-white/40 hover:text-white no-drag" @mousedown.prevent="applyMarkdown('`', '`')"><CodeIcon class="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div v-if="!isEditingDescription" @click="startEditingDescription($event)" class="w-full min-h-[400px] bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] text-white/80 hover:border-white/20 transition-all cursor-text prose prose-invert max-w-none prose-lg font-mono leading-relaxed shadow-inner" v-html="renderedDescription"></div>
                <textarea v-else v-model="selectedCard.description" @blur="isEditingDescription = false" placeholder="Inject system data..." class="description-textarea w-full min-h-[400px] bg-white/[0.03] border border-white/20 p-8 rounded-[2rem] text-xl text-white outline-none transition-all resize-none font-mono leading-relaxed"></textarea>
              </div>
            </ScrollArea>
          </div>

          <div class="w-[450px] flex flex-col bg-white/[0.01]">
            <!-- PARAMETERS SECTION -->
            <div class="border-b border-white/10 transition-all duration-500 overflow-hidden flex flex-col" :class="activeSection === 'parameters' ? 'flex-[1.5]' : 'h-16 shrink-0'">
              <button @click="activeSection = 'parameters'" class="w-full h-16 px-8 flex items-center justify-between hover:bg-white/[0.03] transition-colors group shrink-0">
                <div class="flex items-center gap-4"><Cpu class="w-4 h-4 text-white/20 group-hover:text-white transition-colors" /><span class="text-[10px] font-black uppercase tracking-[0.3em]">Parameters</span></div>
                <div v-if="activeSection !== 'parameters'" class="text-[9px] font-bold text-white/20 uppercase italic truncate ml-4">{{ selectedCard.tags.length }} Tags // {{ selectedCard.dueDate || 'No Date' }}</div>
                <component :is="activeSection === 'parameters' ? ChevronUp : ChevronDown" class="w-4 h-4 text-white/10" />
              </button>
              <ScrollArea v-if="activeSection === 'parameters'" class="flex-1 p-8">
                <div class="space-y-10 animate-in fade-in slide-in-from-top-2 duration-500">
                  <!-- REDESIGNED COLOR SELECTOR -->
                  <div class="space-y-6">
                    <div class="flex items-center justify-between">
                      <div class="text-[9px] font-black text-white/20 uppercase tracking-widest">Aura_Spectrum</div>
                      <div class="text-[8px] font-mono text-white/40 uppercase italic">{{ colors.find(c => c.value === selectedCard.color)?.name }} // {{ colors.find(c => c.value === selectedCard.color)?.hex }}</div>
                    </div>
                    <div class="flex flex-wrap gap-3">
                      <button 
                        v-for="color in colors" :key="color.value" 
                        @click="selectedCard.color = color.value" 
                        class="group relative w-10 h-10 rounded-full border border-white/10 transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden" 
                        :style="{ backgroundColor: color.value === 'transparent' ? '#111' : color.value }" 
                      >
                        <div v-if="selectedCard.color === color.value" class="absolute inset-0 flex items-center justify-center bg-black/20 animate-in fade-in zoom-in-50 duration-300">
                          <div class="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]"></div>
                        </div>
                        <div 
                          class="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-300"
                          :style="{ boxShadow: `inset 0 0 15px ${color.value !== 'transparent' ? color.value : 'white'}` }"
                        ></div>
                      </button>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <div class="text-[9px] font-black text-white/20 uppercase tracking-widest">Identifier_Tags</div>
                    <div class="flex flex-wrap gap-2">
                      <div v-for="tag in selectedCard.tags" :key="tag.id" class="px-3 py-1 rounded-full border border-white/10 text-[9px] font-black uppercase flex items-center gap-2 bg-white/5" :style="{ color: tag.color }">{{ tag.text }}<X class="w-2.5 h-2.5 cursor-pointer hover:text-white" @click="removeTag(tag.id)" /></div>
                      <DropdownMenu><DropdownMenuTrigger as-child><button class="h-6 px-4 rounded-full border border-dashed border-white/10 text-white/20 text-[9px] font-black hover:text-white transition-all">+</button></DropdownMenuTrigger><DropdownMenuContent class="bg-black/95 border-white/20 p-6 w-72 backdrop-blur-3xl rounded-2xl"><div class="space-y-6"><Input v-model="newTagText" v-focus placeholder="Tag Name..." class="bg-white/5 h-12 text-sm font-bold" @keyup.enter="addTag" /><div class="grid grid-cols-6 gap-3"><button v-for="c in tagColors" :key="c" class="w-full aspect-square rounded-full" :style="{ backgroundColor: c }" :class="selectedTagColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''" @click="selectedTagColor = c"></button></div><Button class="w-full bg-white text-black font-black h-12 rounded-xl" @click="addTag">APPLY</Button></div></DropdownMenuContent></DropdownMenu>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <div class="text-[9px] font-black text-white/20 uppercase tracking-widest">Time_Limit</div>
                    <Input type="date" v-model="selectedCard.dueDate" class="h-12 bg-white/5 border-white/10 text-white font-mono font-bold text-xs px-6 rounded-xl" />
                  </div>
                </div>
              </ScrollArea>
            </div>

            <div class="border-b border-white/10 transition-all duration-500 overflow-hidden flex flex-col" :class="activeSection === 'checklist' ? 'flex-[1.5]' : 'h-16 shrink-0'">
              <button @click="activeSection = 'checklist'" class="w-full h-16 px-8 flex items-center justify-between hover:bg-white/[0.03] transition-colors group border-t border-white/10 shrink-0">
                <div class="flex items-center gap-4"><CheckSquare class="w-4 h-4 text-white/20 group-hover:text-white transition-colors" /><span class="text-[10px] font-black uppercase tracking-[0.3em]">Checklist</span></div>
                <div v-if="activeSection !== 'checklist' && getChecklistProgress(selectedCard)" class="text-[9px] font-bold text-white/20 uppercase italic truncate ml-4">{{ getChecklistProgress(selectedCard)?.completed }}/{{ getChecklistProgress(selectedCard)?.total }} Resolved</div>
                <component :is="activeSection === 'checklist' ? ChevronUp : ChevronDown" class="w-4 h-4 text-white/10" />
              </button>
              <ScrollArea v-if="activeSection === 'checklist'" class="flex-1 p-8"><div class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500"><div v-for="item in selectedCard.checklists" :key="item.id" class="flex items-center gap-4 group/check"><button @click="item.completed = !item.completed" class="w-6 h-6 rounded-lg border border-white/10 flex items-center justify-center transition-all" :class="item.completed ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-white/5 hover:border-white/30'"><Check v-if="item.completed" class="w-4 h-4" /></button><input v-model="item.text" class="flex-1 bg-transparent border-none text-base outline-none transition-opacity" :class="item.completed ? 'text-white/20 line-through italic' : 'text-white/80'" /><button class="opacity-0 group-hover/check:opacity-100 p-1 text-white/20 hover:text-red-500 transition-all" @click="removeChecklistItem(item.id)"><Trash2 class="w-4 h-4" /></button></div><div class="flex gap-4 pt-4 border-t border-white/5 items-center"><Plus class="w-4 h-4 text-white/10" /><Input v-model="newChecklistItem" placeholder="Append sub-task..." class="bg-transparent border-none h-10 p-0 text-sm focus-visible:ring-0 placeholder:text-white/5" @keyup.enter="addChecklistItem" /></div></div></ScrollArea>
            </div>

            <div class="transition-all duration-500 overflow-hidden flex flex-col" :class="activeSection === 'activity' ? 'flex-[1.5]' : 'h-16 shrink-0'">
              <button @click="activeSection = 'activity'" class="w-full h-16 px-8 flex items-center justify-between hover:bg-white/[0.03] transition-colors group border-t border-white/10 shrink-0">
                <div class="flex items-center gap-4"><Activity class="w-4 h-4 text-white/20 group-hover:text-white transition-colors" /><span class="text-[10px] font-black uppercase tracking-[0.3em]">Neural_Feed</span></div>
                <div v-if="activeSection !== 'activity'" class="text-[9px] font-bold text-white/20 uppercase italic truncate ml-4">{{ selectedCard.comments.length }} Entry Points</div>
                <component :is="activeSection === 'activity' ? ChevronUp : ChevronDown" class="w-4 h-4 text-white/10" />
              </button>
              <div v-if="activeSection === 'activity'" class="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-top-2 duration-500"><ScrollArea class="flex-1 p-8"><div class="space-y-8"><div v-for="comment in [...selectedCard.comments].reverse()" :key="comment.id" class="space-y-2 group/msg"><div class="flex items-center justify-between text-[8px] font-mono text-white/20 uppercase tracking-widest"><span>UID: {{ comment.id.slice(0,8).toUpperCase() }}</span><span>{{ formatDate(comment.createdAt) }}</span></div><div class="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-white/50 leading-relaxed font-mono group-hover/msg:border-white/20 group-hover/msg:text-white/80 transition-all shadow-inner">{{ comment.text }}</div></div></div></ScrollArea><div class="p-8 border-t border-white/10 bg-white/[0.01]"><Input v-model="commentText" placeholder="Inject thought stream..." class="bg-white/5 border-white/10 h-12 text-sm font-mono rounded-xl px-6" @keyup.enter="handleAddComment" /></div></div>
            </div>
          </div>
        </div>

        <div class="h-20 border-t border-white/10 bg-white/[0.02] flex items-center px-10 justify-between shrink-0">
          <Button variant="ghost" class="text-red-500/50 hover:bg-red-500/10 hover:text-red-400 font-black text-[10px] tracking-widest transition-all" @click="store.deleteCard(boardId, selectedCardColumnId!, selectedCard.id); isCardDetailOpen = false"><Trash2 class="w-4 h-4 mr-2" /> TERMINATE_ENTITY</Button>
          <div class="flex items-center gap-6"><span class="text-[9px] font-black text-white/10 italic tracking-[0.2em] uppercase">Status: Core_Stable</span><Button class="bg-white text-black hover:bg-white/90 font-black px-12 rounded-full h-12 shadow-[0_0_30px_rgba(255,255,255,0.1)]" @click="isCardDetailOpen = false">SYNC & CLOSE</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
:deep([data-radix-scroll-area-viewport]) {
  display: block !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.board-viewport {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.board-viewport::-webkit-scrollbar {
  display: none;
}

textarea {
  resize: none;
}
</style>
