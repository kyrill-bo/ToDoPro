<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  spinSpeed: { type: Number, default: 0.8 }, // Slower rotation
  targets: { type: String, default: '.card-item, .project-card, button, .no-drag' }
})

const mouseX = ref(0)
const mouseY = ref(0)

const cursorX = ref(0)
const cursorY = ref(0)
const cursorW = ref(30) // Smaller base width
const cursorH = ref(30) // Smaller base height
const cursorRotation = ref(0)
const cursorOpacity = ref(0)

const activeTargetRect = ref<DOMRect | null>(null)
const isLocked = ref(false)

const updateMouse = (e: MouseEvent) => {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
  cursorOpacity.value = 1

  const target = (e.target as HTMLElement).closest(props.targets) as HTMLElement
  if (target) {
    activeTargetRect.value = target.getBoundingClientRect()
    isLocked.value = true
  } else {
    activeTargetRect.value = null
    isLocked.value = false
  }
}

const animate = () => {
  const lerp = 0.12 // Slightly smoother tracking
  
  if (isLocked.value && activeTargetRect.value) {
    const rect = activeTargetRect.value
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    cursorX.value += (centerX - cursorX.value) * lerp
    cursorY.value += (centerY - cursorY.value) * lerp
    cursorW.value += (rect.width + 6 - cursorW.value) * lerp // Tighter fit
    cursorH.value += (rect.height + 6 - cursorH.value) * lerp // Tighter fit
    
    // Rotate to 0
    cursorRotation.value += (0 - (cursorRotation.value % 360)) * lerp
  } else {
    cursorX.value += (mouseX.value - cursorX.value) * lerp
    cursorY.value += (mouseY.value - cursorY.value) * lerp
    cursorW.value += (30 - cursorW.value) * lerp
    cursorH.value += (30 - cursorH.value) * lerp
    
    cursorRotation.value += props.spinSpeed
  }
  
  requestAnimationFrame(animate)
}

onMounted(() => {
  window.addEventListener('mousemove', updateMouse)
  window.addEventListener('scroll', () => { isLocked.value = false }, true)
  requestAnimationFrame(animate)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', updateMouse)
})
</script>

<template>
  <div 
    class="target-cursor-root"
    :style="{
      transform: `translate3d(${cursorX}px, ${cursorY}px, 0)`,
      width: `${cursorW}px`,
      height: `${cursorH}px`,
      opacity: cursorOpacity
    }"
    :class="{ 'is-locked': isLocked }"
  >
    <div 
      class="target-rotator"
      :style="{ transform: `rotate(${cursorRotation}deg)` }"
    >
      <div class="bracket top-left"></div>
      <div class="bracket top-right"></div>
      <div class="bracket bottom-left"></div>
      <div class="bracket bottom-right"></div>
    </div>

    <div class="target-cross">
      <div class="cross-h"></div>
      <div class="cross-v"></div>
    </div>
  </div>
</template>

<style scoped>
.target-cursor-root {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  translate: -50% -50%;
  transition: opacity 0.3s ease;
  will-change: transform, width, height;
}

.target-rotator {
  position: absolute;
  inset: 0;
  will-change: transform;
}

.bracket {
  position: absolute;
  width: 10px;
  height: 10px;
  border-color: rgba(255, 255, 255, 0.6);
  border-style: solid;
  transition: all 0.3s ease;
}

.top-left { top: 0; left: 0; border-width: 1.5px 0 0 1.5px; }
.top-right { top: 0; right: 0; border-width: 1.5px 1.5px 0 0; }
.bottom-left { bottom: 0; left: 0; border-width: 0 0 1.5px 1.5px; }
.bottom-right { bottom: 0; right: 0; border-width: 0 1.5px 1.5px 0; }

.target-cross {
  position: absolute;
  width: 8px;
  height: 8px;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.cross-h, .cross-v {
  position: absolute;
  background: white;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.cross-h { width: 100%; height: 1px; }
.cross-v { width: 1px; height: 100%; }

/* Locked State (Always White & Sharp) */
.is-locked .bracket {
  border-color: white;
  width: 12px;
  height: 12px;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.is-locked .target-cross {
  opacity: 0.8;
  transform: scale(1.2);
}
</style>
