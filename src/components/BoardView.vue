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
  X
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
import { VisuallyHidden } from 'reka-ui'
import { Separator } from '@/components/ui/separator'
import type { Card as CardType, Tag } from '@/types'

const props = defineProps<{
  boardId: string
}>()

const store = useTodoStore()
const board = computed(() => store.getBoardById(props.boardId))

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
const selectedTagColor = ref('#0ea5e9')

// --- AUTO-SAVE ON CLOSE ---
watch(isCardDetailOpen, (newVal) => {
  if (!newVal && selectedCard.value && selectedCardColumnId.value) {
    // When dialog closes, save everything to store
    store.updateCard(props.boardId, selectedCardColumnId.value, selectedCard.value.id, selectedCard.value)
  }
})

// --- ROBUST PANNING LOGIC ---
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

// Store Actions
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
    selectedCard.value.checklists.push({
      id: crypto.randomUUID(),
      text: newChecklistItem.value,
      completed: false
    })
    newChecklistItem.value = ''
  }
}

const removeChecklistItem = (id: string) => {
  if (selectedCard.value) {
    selectedCard.value.checklists = selectedCard.value.checklists.filter(i => i.id !== id)
  }
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

const tagColors = ['#0ea5e9', '#a855f7', '#10b981', '#ef4444', '#f59e0b', '#6366f1']

const vFocus = {
  mounted: (el: HTMLElement) => {
    // If it's a shadcn Input, the actual input might be a child
    const input = el.tagName === 'INPUT' ? el : el.querySelector('input')
    input?.focus()
  }
}
</script>

<template>
  <div v-if="board" class="h-full w-full relative overflow-hidden flex flex-col">
    <div ref="viewportRef" class="flex-1 overflow-x-auto overflow-y-hidden cursor-grab select-none" @mousedown="onMouseDown">
      <div class="flex items-start h-full p-8 min-w-full w-max gap-6">
        <draggable v-model="board.columns" group="columns" item-key="id" handle=".column-handle" class="flex gap-6 h-full items-start" ghost-class="opacity-50">
          <template #item="{ element: column }">
            <div class="w-80 flex-shrink-0 flex flex-col bg-white/[0.03] border border-white/5 backdrop-blur-xl rounded-2xl max-h-full shadow-2xl overflow-hidden">
              <!-- Column Header -->
              <div class="p-4 flex items-center justify-between column-handle cursor-grab active:cursor-grabbing border-b border-white/5 bg-white/[0.02]">
                <GripVertical class="w-4 h-4 text-white/10 mr-2 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <Input v-if="editingColumnId === column.id" v-model="editingColumnTitle" v-focus class="h-8 bg-white/5 border-white/10 text-sm font-bold no-drag" @blur="saveColumnTitle(column.id)" @keyup.enter="saveColumnTitle(column.id)" @mousedown.stop />
                  <h3 v-else class="text-xs font-black uppercase tracking-widest truncate cursor-pointer hover:text-white transition-colors" @mousedown.stop @click="editingColumnId = column.id; editingColumnTitle = column.title">{{ column.title }}</h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child class="dropdown-trigger"><Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-white/5 text-white/20 no-drag" @mousedown.stop><MoreVertical class="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="bg-black/90 backdrop-blur-xl border-white/10 text-white p-2">
                    <DropdownMenuItem class="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-md no-drag" @click="editingColumnId = column.id; editingColumnTitle = column.title"><Type class="w-4 h-4 mr-2 text-white/40" />Umbenennen</DropdownMenuItem>
                    <DropdownMenuItem class="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-md no-drag" @click="store.deleteColumn(boardId, column.id)"><Trash2 class="w-4 h-4 mr-2" />Spalte löschen</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <!-- Cards List -->
              <ScrollArea class="flex-1 px-3 py-4">
                <draggable v-model="column.cards" group="cards" item-key="id" class="space-y-4 min-h-[150px] pb-6" ghost-class="opacity-20">
                  <template #item="{ element: card }">
                    <Card class="card-item group relative transition-all cursor-pointer overflow-hidden border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 hover:scale-[1.02] active:scale-[0.98]" :style="{ borderLeftColor: card.color && card.color !== 'transparent' ? card.color : '', borderLeftWidth: card.color && card.color !== 'transparent' ? '4px' : '1px' }" @click="openCardDetail(card, column.id)">
                      <CardHeader class="p-4 pb-2 space-y-2">
                        <div v-if="card.tags?.length" class="flex flex-wrap gap-1">
                          <div v-for="tag in card.tags" :key="tag.id" class="h-1 w-4 rounded-full" :style="{ backgroundColor: tag.color }"></div>
                        </div>
                        <p class="text-sm font-bold leading-tight text-white/80 group-hover:text-white transition-colors">{{ card.title }}</p>
                      </CardHeader>
                      <CardContent class="p-4 pt-0 space-y-3">
                        <p v-if="card.description" class="text-[11px] text-white/30 line-clamp-2 leading-relaxed">{{ card.description }}</p>
                        <div class="flex items-center gap-3 text-[10px] font-black text-white/20 uppercase tracking-tighter">
                          <div v-if="card.dueDate" class="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                            <Calendar class="w-3 h-3" />{{ card.dueDate }}
                          </div>
                          <div v-if="getChecklistProgress(card)" class="flex items-center gap-1.5" :class="getChecklistProgress(card)?.completed === getChecklistProgress(card)?.total ? 'text-green-500' : ''">
                            <CheckSquare class="w-3 h-3" />{{ getChecklistProgress(card)?.completed }}/{{ getChecklistProgress(card)?.total }}
                          </div>
                          <div v-if="card.comments?.length" class="flex items-center gap-1.5">
                            <MessageSquare class="w-3 h-3" />{{ card.comments.length }}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </template>
                </draggable>
              </ScrollArea>

              <!-- Add Card Footer -->
              <div class="p-3 bg-white/[0.01] border-t border-white/5">
                <div v-if="isAddingCard[column.id]" class="space-y-2">
                  <Input v-model="newCardTitle[column.id]" v-focus placeholder="Titel..." class="bg-white/5 border-white/10 text-sm h-10 no-drag" @keyup.enter="handleAddCard(column.id)" @mousedown.stop />
                  <div class="flex gap-2">
                    <Button size="sm" class="bg-white text-black hover:bg-white/90 font-bold no-drag" @click="handleAddCard(column.id)">OK</Button>
                    <Button size="sm" variant="ghost" class="text-white/20 no-drag" @click="isAddingCard[column.id] = false">X</Button>
                  </div>
                </div>
                <Button v-else variant="ghost" class="w-full justify-start gap-2 h-10 text-white/20 hover:text-white/60 hover:bg-white/5 transition-all no-drag" @click="isAddingCard[column.id] = true">
                  <Plus class="w-4 h-4" />
                  <span class="text-[10px] font-black uppercase tracking-widest">Karte hinzufügen</span>
                </Button>
              </div>
            </div>
          </template>
        </draggable>

        <!-- Add Column -->
        <div class="w-80 flex-shrink-0 ml-4">
          <div v-if="isAddingColumn" class="bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-2xl space-y-4 shadow-2xl" @mousedown.stop>
            <Input v-model="newColumnTitle" v-focus placeholder="Spaltenname..." class="bg-white/5 border-white/10 h-12 text-lg font-bold italic uppercase no-drag" @keyup.enter="handleAddColumn" />
            <div class="flex gap-3">
              <Button class="bg-white text-black hover:bg-white/90 font-black flex-1 no-drag" @click="handleAddColumn">HINZÜFÜGEN</Button>
              <Button variant="ghost" class="text-white/20 text-xs no-drag" @click="isAddingColumn = false">ABBRUCH</Button>
            </div>
          </div>
          <button v-else class="w-full h-20 border-2 border-dashed border-white/5 bg-transparent hover:bg-white/[0.02] hover:border-white/10 rounded-2xl flex items-center justify-center gap-4 transition-all group text-white/20 hover:text-white/40 font-black uppercase tracking-[0.2em] text-xs no-drag" @click="isAddingColumn = true">
            <Plus class="w-5 h-5" />
            Spalte
          </button>
        </div>
      </div>
    </div>

    <!-- Card Detail Dialog -->
    <Dialog v-model:open="isCardDetailOpen">
      <DialogContent hide-close class="max-w-3xl max-h-[90vh] overflow-y-auto bg-black/95 backdrop-blur-3xl border-white/10 text-white p-0 overflow-hidden z-[1000]">
        <VisuallyHidden>
          <DialogTitle>{{ selectedCard?.title || 'Kartendetails' }}</DialogTitle>
          <DialogDescription>Bearbeite Titel, Beschreibung, Tags und Checklisten der Karte.</DialogDescription>
        </VisuallyHidden>

        <!-- Custom Close Button (X) -->
        <button 
          class="absolute top-6 right-6 z-[1001] p-2 rounded-full hover:bg-white/10 text-white/20 hover:text-white transition-all no-drag"
          @click="isCardDetailOpen = false"
        >
          <X class="w-5 h-5" />
        </button>

        <div v-if="selectedCard" class="flex flex-col h-full">
          <!-- Header with Color Accent -->
          <div class="h-2 w-full" :style="{ backgroundColor: selectedCard.color !== 'transparent' ? selectedCard.color : '#333' }"></div>
          
          <div class="p-8 space-y-8">
            <DialogHeader>
              <div class="flex items-center gap-2 text-white/20 mb-2 uppercase font-black text-[10px] tracking-widest">
                <Type class="w-3 h-3" />TITEL
              </div>
              <Input v-model="selectedCard.title" class="text-3xl font-black italic uppercase h-auto py-2 px-0 border-transparent hover:border-white/5 focus:border-white/10 bg-transparent text-white tracking-tighter w-[90%]" />
              <DialogDescription class="text-white/30 text-xs uppercase font-bold tracking-widest">
                IN SPALTE "{{ board.columns.find(c => c.id === selectedCardColumnId)?.title }}"
              </DialogDescription>
            </DialogHeader>

            <!-- Tags Section -->
            <div class="space-y-3">
              <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                <TagIcon class="w-3 h-3" />TAGS
              </div>
              <div class="flex flex-wrap gap-2">
                <div v-for="tag in selectedCard.tags" :key="tag.id" class="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter" :style="{ backgroundColor: tag.color + '20', border: `1px solid ${tag.color}40`, color: tag.color }">
                  {{ tag.text }}
                  <X class="w-3 h-3 cursor-pointer hover:text-white" @click="selectedCard.tags = selectedCard.tags.filter(t => t.id !== tag.id)" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <button class="h-6 px-3 rounded-full border border-dashed border-white/20 text-white/40 text-[10px] font-black hover:border-white/40 hover:text-white transition-all">+ NEU</button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent class="bg-black/90 border-white/10 p-4 w-64">
                    <div class="space-y-4">
                      <Input v-model="newTagText" placeholder="Tag Name..." class="bg-white/5 h-8 text-xs" @keyup.enter="addTag" />
                      <div class="grid grid-cols-6 gap-2">
                        <button v-for="c in tagColors" :key="c" class="w-full aspect-square rounded-full border border-white/10" :style="{ backgroundColor: c }" :class="selectedTagColor === c ? 'ring-2 ring-white' : ''" @click="selectedTagColor = c"></button>
                      </div>
                      <Button class="w-full h-8 bg-white text-black font-black text-[10px]" @click="addTag">HINZÜFÜGEN</Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div class="md:col-span-2 space-y-10">
                <!-- Description -->
                <div class="space-y-3">
                  <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                    <AlignLeft class="w-3 h-3" />BESCHREIBUNG
                  </div>
                  <textarea v-model="selectedCard.description" placeholder="Füge Details hinzu..." class="w-full min-h-[150px] p-4 rounded-xl border border-white/5 bg-white/[0.02] text-sm focus:outline-none focus:ring-1 focus:ring-white/10 text-white/70 leading-relaxed"></textarea>
                </div>

                <!-- Checklists -->
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                      <CheckSquare class="w-3 h-3" />CHECKLISTE
                    </div>
                    <div v-if="getChecklistProgress(selectedCard)" class="text-[10px] font-black text-white/40">
                      {{ Math.round((getChecklistProgress(selectedCard)!.completed / getChecklistProgress(selectedCard)!.total) * 100) }}%
                    </div>
                  </div>
                  
                  <div class="space-y-2">
                    <div v-for="item in selectedCard.checklists" :key="item.id" class="flex items-center gap-3 group/check">
                      <button class="w-5 h-5 rounded border border-white/10 flex items-center justify-center transition-colors" :class="item.completed ? 'bg-white text-black border-white' : 'bg-white/5 hover:border-white/30'" @click="item.completed = !item.completed">
                        <Check v-if="item.completed" class="w-3 h-3" />
                      </button>
                      <input v-model="item.text" class="flex-1 bg-transparent border-none text-sm focus:outline-none transition-opacity" :class="item.completed ? 'text-white/20 line-through' : 'text-white/80'" />
                      <button class="opacity-0 group-hover/check:opacity-100 p-1 text-white/20 hover:text-red-500 transition-all" @click="removeChecklistItem(item.id)"><Trash2 class="w-3 h-3" /></button>
                    </div>
                  </div>

                  <div class="flex gap-3 pt-2">
                    <div class="w-5 h-5"></div>
                    <Input v-model="newChecklistItem" placeholder="Punkt hinzufügen..." class="flex-1 bg-white/5 border-white/10 h-9 text-xs" @keyup.enter="addChecklistItem" />
                  </div>
                </div>

                <!-- Activity -->
                <div class="space-y-6">
                  <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                    <MessageSquare class="w-3 h-3" />AKTIVITÄT
                  </div>
                  <div class="flex gap-4">
                    <div class="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black border border-white/10">ME</div>
                    <div class="flex-1 space-y-3">
                      <Input v-model="commentText" placeholder="Kommentar..." class="bg-white/5 border-white/10 h-11 text-sm" @keyup.enter="handleAddComment" />
                      <Button v-if="commentText" size="sm" class="bg-white text-black hover:bg-white/90 font-bold px-6" @click="handleAddComment">SENDEN</Button>
                    </div>
                  </div>
                  <div class="space-y-6 pt-4">
                    <div v-for="comment in [...selectedCard.comments].reverse()" :key="comment.id" class="flex gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div class="h-9 w-9 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[10px] font-bold text-white/40">U</div>
                      <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                          <span class="text-[10px] font-black text-white/60 uppercase">USER</span>
                          <span class="text-[9px] font-medium text-white/20 tracking-widest">{{ formatDate(comment.createdAt) }}</span>
                        </div>
                        <p class="text-sm bg-white/[0.03] border border-white/5 p-3 rounded-xl text-white/60">{{ comment.text }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sidebar -->
              <div class="space-y-8">
                <div class="space-y-4">
                  <div class="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Kartenfarbe</div>
                  <div class="grid grid-cols-3 gap-3">
                    <button v-for="color in colors" :key="color.value" class="h-10 w-full rounded-lg border border-white/5 transition-all hover:scale-110 active:scale-95 shadow-lg" :style="{ backgroundColor: color.value === 'transparent' ? '#111' : color.value }" :class="selectedCard.color === color.value ? 'ring-2 ring-white ring-offset-4 ring-offset-black' : ''" @click="selectedCard.color = color.value"></button>
                  </div>
                </div>
                <div class="space-y-4">
                  <div class="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Fälligkeit</div>
                  <Input type="date" v-model="selectedCard.dueDate" class="h-11 bg-white/5 border-white/10 text-white font-bold" />
                </div>
                <Separator class="bg-white/5" />
                <Button variant="ghost" class="w-full justify-start gap-2 h-11 text-red-500 hover:bg-red-500/10 hover:text-red-400 font-bold text-[10px] tracking-widest" @click="store.deleteCard(boardId, selectedCardColumnId!, selectedCard.id); isCardDetailOpen = false">
                  <Trash2 class="w-4 h-4" />LÖSCHEN
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter class="border-t border-white/5 p-6 bg-white/[0.01]">
            <Button class="bg-white text-black hover:bg-white/90 font-black px-10 rounded-full w-full h-12" @click="isCardDetailOpen = false">SCHLIESSEN & SPEICHERN</Button>
          </DialogFooter>
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
</style>
