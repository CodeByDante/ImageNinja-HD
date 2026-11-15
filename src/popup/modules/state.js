// --- ESTADO GLOBAL ---
export const state = {
  allImages: [],
  filteredImages: [],
  selectedImages: new Set(),
  lastSelectedIdx: -1,
  isHDSearching: false,
  downloadMap: new Map(),
  isDragging: false,
  dragMode: true,
  dragStartIdx: -1,
  dragSavedSelection: new Set()
};

// --- ELEMENTOS DEL DOM ---
export const DOM = {
  grid: document.getElementById('imageGrid'),
  filterUrl: document.getElementById('filterUrl'),
  filterExt: document.getElementById('filterExt'),
  minWidth: document.getElementById('minWidth'),
  minWidthVal: document.getElementById('minWidthVal'),
  minHeight: document.getElementById('minHeight'),
  minHeightVal: document.getElementById('minHeightVal'),
  forceHD: document.getElementById('forceHD'),
  separateQuality: document.getElementById('separateQuality'),
  renameSequential: document.getElementById('renameSequential'),
  smartComic: document.getElementById('smartComic'),
  forcePNG: document.getElementById('forcePNG'),
  selectAll: document.getElementById('selectAll'),
  selectedCount: document.getElementById('selectedCount'),
  totalCount: document.getElementById('totalCount'),
  downloadBtn: document.getElementById('downloadBtn'),
  btnCounter: document.getElementById('btnCounter'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  subfolderInput: document.getElementById('subfolder'),
  cleanBrokenToggle: document.getElementById('cleanBrokenToggle'),
  // Búsqueda Secuencial
  toggleSeqBtn: document.getElementById('toggleSeqBtn'),
  seqPanel: document.getElementById('seqPanel'),
  seqUrlPattern: document.getElementById('seqUrlPattern'),
  seqStart: document.getElementById('seqStart'),
  seqEnd: document.getElementById('seqEnd'),
  seqSelector: document.getElementById('seqSelector'),
  seqStartBtn: document.getElementById('seqStartBtn'),
  seqProgress: document.getElementById('seqProgress'),
  seqProgressText: document.getElementById('seqProgressText'),
  seqProgressStatus: document.getElementById('seqProgressStatus'),
  seqProgressBar: document.getElementById('seqProgressBar'),
  collapsibleFilters: document.getElementById('collapsibleFilters'),
  toggleFiltersBtn: document.getElementById('toggleFiltersBtn'),
  // Panel Pegar Enlaces
  togglePasteBtn: document.getElementById('togglePasteBtn'),
  pastePanel: document.getElementById('pastePanel'),
  pasteLinksTextarea: document.getElementById('pasteLinksTextarea'),
  clearPastedBtn: document.getElementById('clearPastedBtn'),
  processPastedBtn: document.getElementById('processPastedBtn'),
  downloadPastedBtn: document.getElementById('downloadPastedBtn'),
  pasteStatus: document.getElementById('pasteStatus')
};
