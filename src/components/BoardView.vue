<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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
  ChevronRight,
  Database
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
import type { Card as CardType, Tag } from '@/types'

const props = defineProps<{
  boardId: string
}>()

const store = useTodoStore()
const board = computed(() => store.getBoardById(props.boardId))

// State
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

// --- AUTO-SAVE ---
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
    selectedCard.value.tags.push({ id: crypto.randomUUID(), text: newTagText.value, color: selectedTagColor.value })
    newTagText.value = ''
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
  { name: 'None', value: 'transparent' },
  { name: 'White', value: '#ffffff' },
  { name: 'Blue', value: '#0ea5e9' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#ef4444' },
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
    <div 
      ref="viewportRef"
      class="flex-1 overflow-x-auto overflow-y-hidden cursor-grab select-none"
      @mousedown="onMouseDown"
    >
      <div class="flex items-start h-full p-10 min-w-full w-max gap-10">
        <!-- Draggable Rails (Columns) -->
        <draggable
          v-model="board.columns"
          group="columns"
          item-key="id"
          handle=".column-handle"
          class="flex gap-10 h-full items-start"
          ghost-class="opacity-50"
        >
          <template #item="{ element: column }">
            <div class="w-80 flex-shrink-0 flex flex-col bg-white/[0.02] border-x border-white/10 h-full relative group/rail">
              <!-- Top Tech Header -->
              <div class="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                <div 
                  class="h-full bg-white transition-all duration-700 ease-out"
                  :style="{ width: Math.min(100, (column.cards.length / 10) * 100) + '%' }"
                ></div>
              </div>

              <!-- Header -->
              <div class="p-6 flex items-start justify-between column-handle cursor-grab active:cursor-grabbing">
                <div class="space-y-1 flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <Database class="w-3 h-3 text-white/20" />
                    <span class="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Sector_{{ column.id.slice(0,2).toUpperCase() }}</span>
                  </div>
                  
                  <Input 
                    v-if="editingColumnId === column.id" 
                    v-model="editingColumnTitle" 
                    v-focus 
                    class="h-8 bg-white/5 border-white/20 text-sm font-black italic uppercase"
                    @blur="saveColumnTitle(column.id)"
                    @keyup.enter="saveColumnTitle(column.id)"
                    @mousedown.stop 
                  />
                  <h3 
                    v-else 
                    class="text-xl font-black italic uppercase tracking-tighter truncate cursor-pointer hover:text-white transition-colors"
                    @mousedown.stop 
                    @click="editingColumnId = column.id; editingColumnTitle = column.title"
                  >
                    {{ column.title }}
                  </h3>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger as-child class="dropdown-trigger">
                    <Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-white/10 text-white/20 no-drag" @mousedown.stop>
                      <MoreVertical class="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="bg-black/95 backdrop-blur-xl border-white/10 text-white p-2">
                    <DropdownMenuItem class="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-md no-drag font-bold text-[10px] uppercase tracking-widest" @click="editingColumnId = column.id; editingColumnTitle = column.title">
                      <Type class="w-4 h-4 mr-2" /> Umbenennen
                    </DropdownMenuItem>
                    <DropdownMenuItem class="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-md no-drag font-bold text-[10px] uppercase tracking-widest" @click="store.deleteColumn(boardId, column.id)">
                      <Trash2 class="w-4 h-4 mr-2" /> Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <!-- Processing Feed (Cards List) -->
              <ScrollArea class="flex-1 px-4 py-2">
                <draggable
                  v-model="column.cards"
                  group="cards"
                  item-key="id"
                  class="space-y-6 min-h-[200px] pb-10"
                  ghost-class="opacity-10"
                >
                  <template #item="{ element: card }">
                    <div 
                      class="card-item group relative transition-all cursor-pointer overflow-hidden border-t border-white/10 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/30 active:scale-[0.98] pointer-events-auto p-5 space-y-4"
                      @click="openCardDetail(card, column.id)"
                    >
                      <!-- Progress Bar on top of card -->
                      <div v-if="getChecklistProgress(card)" class="absolute top-0 left-0 w-full h-[1px] bg-white/5 overflow-hidden">
                        <div class="h-full bg-white opacity-40" :style="{ width: (getChecklistProgress(card)!.completed / getChecklistProgress(card)!.total * 100) + '%' }"></div>
                      </div>

                      <div class="flex flex-wrap gap-1.5">
                        <div v-for="tag in card.tags" :key="tag.id" class="px-2 py-0.5 rounded-[2px] text-[7px] font-black uppercase tracking-tighter border" :style="{ borderColor: tag.color + '40', color: tag.color, backgroundColor: tag.color + '10' }">
                          {{ tag.text }}
                        </div>
                      </div>

                      <p class="text-sm font-black italic uppercase leading-tight text-white/70 group-hover:text-white transition-colors tracking-tight">{{ card.title }}</p>
                      
                      <div class="flex items-center justify-between text-[9px] font-black text-white/10 uppercase tracking-widest pt-2">
                        <div class="flex items-center gap-3">
                          <div v-if="card.dueDate" class="flex items-center gap-1"><Calendar class="w-2.5 h-2.5" />{{ card.dueDate }}</div>
                          <div v-if="card.comments?.length" class="flex items-center gap-1"><MessageSquare class="w-2.5 h-2.5" />{{ card.comments.length }}</div>
                        </div>
                        <div v-if="getChecklistProgress(card)" class="text-white/30">
                          {{ getChecklistProgress(card)?.completed }}/{{ getChecklistProgress(card)?.total }}
                        </div>
                      </div>

                      <!-- Side accent -->
                      <div 
                        class="absolute left-0 top-0 w-[2px] h-full"
                        :style="{ backgroundColor: card.color !== 'transparent' ? card.color : 'transparent' }"
                      ></div>
                    </div>
                  </template>
                </draggable>
              </ScrollArea>

              <!-- Footer Input -->
              <div class="p-4 border-t border-white/5 bg-black/20">
                <div v-if="isAddingCard[column.id]" class="space-y-3 p-2 bg-white/[0.02] rounded-xl border border-white/10 animate-in fade-in slide-in-from-bottom-2">
                  <Input v-model="newCardTitle[column.id]" v-focus placeholder="Initialize data..." class="bg-transparent border-none text-sm h-8 focus-visible:ring-0 font-mono" @keyup.enter="handleAddCard(column.id)" @mousedown.stop />
                  <div class="flex gap-2">
                    <Button size="sm" class="bg-white text-black font-black text-[10px] flex-1" @click="handleAddCard(column.id)">APPEND</Button>
                    <Button size="sm" variant="ghost" class="text-white/20 text-[10px]" @click="isAddingCard[column.id] = false">X</Button>
                  </div>
                </div>
                <button 
                  v-else 
                  class="w-full h-10 flex items-center justify-center gap-3 text-white/10 hover:text-white/40 hover:bg-white/[0.02] transition-all no-drag border border-dashed border-white/5 rounded-xl group/add"
                  @click="isAddingCard[column.id] = true"
                >
                  <Plus class="w-4 h-4 group-hover/add:rotate-90 transition-transform" />
                  <span class="text-[9px] font-black uppercase tracking-[0.3em]">Add_Entry</span>
                </button>
              </div>
            </div>
          </template>
        </draggable>

        <!-- Add Column (Ghost Rail) -->
        <div class="w-80 flex-shrink-0 h-full">
          <div v-if="isAddingColumn" class="bg-white/[0.03] border border-white/20 backdrop-blur-xl p-8 rounded-2xl space-y-6 animate-in zoom-in-95" @mousedown.stop>
            <div class="space-y-2">
              <span class="text-[8px] font-black text-white/20 uppercase tracking-widest">New_Sector_Link</span>
              <Input v-model="newColumnTitle" v-focus placeholder="Enter Sector Name..." class="bg-white/5 border-white/10 h-12 text-xl font-black italic uppercase" @keyup.enter="handleAddColumn" />
            </div>
            <div class="flex gap-3">
              <Button class="bg-white text-black hover:bg-white/90 font-black flex-1 h-12 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]" @click="handleAddColumn">INITIALIZE</Button>
              <Button variant="ghost" class="text-white/20 text-[10px] font-bold" @click="isAddingColumn = false">VOID</Button>
            </div>
          </div>
          
          <button 
            v-else 
            class="w-full h-full border-x border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all no-drag flex flex-col items-center justify-center gap-6 group/ghost"
            @click="isAddingColumn = true"
          >
            <!-- Ghost Icon with rotating effect on hover -->
            <div class="relative w-16 h-16 flex items-center justify-center">
              <div class="absolute inset-0 rounded-full border border-dashed border-white/10 group-hover/ghost:rotate-90 transition-transform duration-1000"></div>
              <Plus class="w-6 h-6 text-white/5 group-hover/ghost:text-white/40 transition-colors" />
            </div>
            
            <div class="flex flex-col items-center gap-1">
              <span class="text-[9px] font-black uppercase tracking-[0.4em] text-white/5 group-hover/ghost:text-white/20 transition-all">Ready_to_Link</span>
              <span class="text-[11px] font-black uppercase italic tracking-tighter text-white/5 group-hover/ghost:text-white/10 transition-all">Append_New_Rail</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- RADICAL "CYBER-BLADE" CARD DETAIL -->
    <Dialog v-model:open="isCardDetailOpen">
      <DialogContent hide-close class="max-w-none w-[95vw] h-[90vh] bg-transparent border-none text-white p-0 overflow-hidden z-[1000] flex items-center justify-center shadow-none outline-none">
        <VisuallyHidden>
          <DialogTitle>{{ selectedCard?.title }}</DialogTitle>
          <DialogDescription>Advanced Cyber HUD Interface</DialogDescription>
        </VisuallyHidden>

        <div v-if="selectedCard" class="flex w-full h-full max-w-7xl gap-4 p-4 animate-in fade-in zoom-in-95 duration-500">
          <!-- Blade 1: Main (Details) -->
          <div class="flex-[1.5] bg-black/80 backdrop-blur-3xl border border-white/20 rounded-[2rem] flex flex-col overflow-hidden shadow-2xl relative">
            <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
            <div class="p-8 border-b border-white/10 bg-white/[0.02] flex items-start justify-between">
              <div class="space-y-2">
                <div class="flex items-center gap-3">
                  <div class="px-2 py-0.5 rounded bg-white text-black font-mono text-[10px] font-black tracking-tighter uppercase">Entry_Point</div>
                  <div class="text-[10px] font-mono text-white/20 tracking-[0.3em] uppercase italic">Diagnostic active</div>
                </div>
                <Input v-model="selectedCard.title" v-focus class="text-4xl font-black italic uppercase bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-white tracking-tighter w-full" />
              </div>
              <Button variant="ghost" size="icon" class="rounded-full hover:bg-white/10 text-white/20 no-drag" @click="isCardDetailOpen = false">
                <X class="w-6 h-6" />
              </Button>
            </div>
            <ScrollArea class="flex-1 p-8">
              <div class="space-y-12">
                <div class="space-y-4">
                  <div class="flex items-center gap-2 text-[10px] font-black text-white/20 tracking-[0.4em]"><Terminal class="w-3 h-3" /> // DESCRIPTION_LOG</div>
                  <textarea v-model="selectedCard.description" placeholder="..." class="w-full min-h-[200px] bg-white/[0.02] border border-white/10 p-6 rounded-3xl text-lg text-white/80 focus:ring-1 focus:ring-white/20 outline-none transition-all resize-none font-mono"></textarea>
                </div>
                <div class="space-y-6 bg-white/[0.01] border border-white/10 p-8 rounded-3xl relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-1 h-full bg-white/20"></div>
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2 text-[10px] font-black text-white/20 tracking-[0.4em]"><CheckSquare class="w-3 h-3" /> // SUB_TASKS</div>
                    <div class="font-mono text-[10px] text-white/40 bg-white/5 px-3 py-1 rounded-full italic">COMPLETE: {{ Math.round((getChecklistProgress(selectedCard)?.completed || 0) / (getChecklistProgress(selectedCard)?.total || 1) * 100) }}%</div>
                  </div>
                  <div class="space-y-3">
                    <div v-for="item in selectedCard.checklists" :key="item.id" class="flex items-center gap-4 group/blade-item">
                      <button class="w-6 h-6 rounded border border-white/10 flex items-center justify-center transition-all" :class="item.completed ? 'bg-white text-black' : 'bg-white/5 hover:border-white/30'" @click="item.completed = !item.completed"><Check v-if="item.completed" class="w-4 h-4" /></button>
                      <input v-model="item.text" class="flex-1 bg-transparent border-none text-base outline-none transition-all font-medium" :class="item.completed ? 'text-white/20 line-through' : 'text-white/80'" />
                      <button class="opacity-0 group-hover/blade-item:opacity-100 text-white/20 hover:text-red-500 transition-all" @click="removeChecklistItem(item.id)"><Trash2 class="w-4 h-4" /></button>
                    </div>
                    <div class="flex gap-4 pt-4 border-t border-white/10"><div class="w-6 h-6 flex items-center justify-center"><Plus class="w-4 h-4 text-white/20" /></div><Input v-model="newChecklistItem" placeholder="APPEND_ITEM..." class="bg-transparent border-none h-6 p-0 text-sm focus-visible:ring-0 placeholder:text-white/10" @keyup.enter="addChecklistItem" /></div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <!-- Blade 2: Settings -->
          <div class="w-80 bg-white/[0.03] backdrop-blur-2xl border border-white/20 rounded-[2rem] flex flex-col overflow-hidden shadow-xl">
            <div class="p-8 border-b border-white/10 bg-white/[0.02]"><div class="flex items-center gap-2 text-[10px] font-black text-white/20 tracking-[0.4em]"><Cpu class="w-3 h-3" /> MODULES</div></div>
            <div class="flex-1 p-8 space-y-10">
              <div class="space-y-4">
                <div class="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2"><TagIcon class="w-3 h-3" /> IDENTIFIERS</div>
                <div class="flex flex-wrap gap-2">
                  <div v-for="tag in selectedCard.tags" :key="tag.id" class="flex items-center gap-2 px-3 py-1 rounded-md text-[9px] font-black border" :style="{ borderColor: tag.color + '40', color: tag.color, backgroundColor: tag.color + '10' }">{{ tag.text }}<X class="w-2.5 h-2.5 cursor-pointer hover:text-white" @click="selectedCard.tags = selectedCard.tags.filter(t => t.id !== tag.id)" /></div>
                  <DropdownMenu><DropdownMenuTrigger as-child><button class="h-8 px-4 rounded-full border border-dashed border-white/10 text-white/20 text-[10px] font-black hover:border-white/30 hover:text-white transition-all">+</button></DropdownMenuTrigger><DropdownMenuContent class="bg-black/95 border-white/10 p-4 w-64 backdrop-blur-3xl"><div class="space-y-4"><Input v-model="newTagText" placeholder="NAME..." class="bg-white/5 h-10 text-xs" @keyup.enter="addTag" /><div class="grid grid-cols-6 gap-2"><button v-for="c in tagColors" :key="c" class="w-full aspect-square rounded-lg" :style="{ backgroundColor: c }" :class="selectedTagColor === c ? 'ring-2 ring-white' : ''" @click="selectedTagColor = c"></button></div><Button class="w-full bg-white text-black font-black" @click="addTag">APPLY</Button></div></DropdownMenuContent></DropdownMenu>
                </div>
              </div>
              <div class="space-y-4">
                <div class="text-[10px] font-black text-white/20 uppercase tracking-widest">SIGNAL_COLOR</div>
                <div class="grid grid-cols-3 gap-3">
                  <button v-for="color in colors" :key="color.value" class="h-10 w-full rounded-xl border border-white/10 transition-all hover:scale-110 active:scale-95 shadow-lg" :style="{ backgroundColor: color.value === 'transparent' ? '#111' : color.value }" :class="selectedCard.color === color.value ? 'ring-2 ring-white ring-offset-4 ring-offset-black' : ''" @click="selectedCard.color = color.value"></button>
                </div>
              </div>
              <div class="space-y-4">
                <div class="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2"><Clock class="w-3 h-3" /> DEADLINE</div>
                <Input type="date" v-model="selectedCard.dueDate" class="h-12 bg-white/5 border-white/10 text-white font-mono font-bold text-xs" />
              </div>
            </div>
            <div class="p-6 bg-white/[0.02] border-t border-white/10">
              <Button class="w-full bg-white text-black hover:bg-white/90 font-black h-14 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-between px-6" @click="isCardDetailOpen = false">
                <span>COMMIT CHANGES</span><ChevronRight class="w-5 h-5" />
              </Button>
            </div>
          </div>

          <!-- Blade 3: Activity Feed -->
          <div class="w-96 bg-black/40 backdrop-blur-md border border-white/10 rounded-[2rem] flex flex-col overflow-hidden shadow-lg group/activity">
            <div class="p-8 flex items-center justify-between border-b border-white/10"><div class="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">LOG_FEED</div><div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div></div>
            <ScrollArea class="flex-1 p-6">
              <div class="space-y-6">
                <div v-for="comment in [...selectedCard.comments].reverse()" :key="comment.id" class="space-y-2 group/msg">
                  <div class="flex items-center justify-between text-[8px] font-mono text-white/20 uppercase"><span>UID: 0x{{ comment.id.slice(0,4) }}</span><span>{{ formatDate(comment.createdAt) }}</span></div>
                  <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-white/50 leading-relaxed font-mono group-hover/msg:border-white/20 group-hover/msg:text-white/80 transition-all">{{ comment.text }}</div>
                </div>
              </div>
            </ScrollArea>
            <div class="p-6 border-t border-white/10 space-y-3">
              <Input v-model="commentText" placeholder="Add entry..." class="bg-white/5 border-white/10 h-10 text-xs font-mono" @keyup.enter="handleAddComment" />
              <Button v-if="commentText" class="w-full bg-white/10 hover:bg-white/20 text-white font-black text-[10px]" @click="handleAddComment">APPEND_LOG</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
:deep([data-radix-scroll-area-viewport]) {
  display: block !important;
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

.shadow-2xl {
  box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.5), 0 30px 60px -30px rgba(0, 0, 0, 0.5);
}
</style>
