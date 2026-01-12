import React, { useState, useRef, useEffect } from 'react';

const INITIAL_COLOR_ORDER = [
  { id: 'red', hex: '#ef4444', label: 'Hot' },
  { id: 'orange', hex: '#f97316', label: 'Warm' },
  { id: 'amber', hex: '#f59e0b', label: 'Active' },
  { id: 'yellow', hex: '#eab308', label: 'Pending' },
  { id: 'lime', hex: '#84cc16', label: 'Progressing' },
  { id: 'green', hex: '#22c55e', label: 'Won' },
  { id: 'teal', hex: '#14b8a6', label: 'Nurture' },
  { id: 'blue', hex: '#3b82f6', label: 'Follow-up' },
  { id: 'purple', hex: '#a855f7', label: 'VIP' },
  { id: 'pink', hex: '#ec4899', label: 'Priority' },
];

const NUM_COLS = 8;
const NUM_ROWS = 20;

const getColLetter = (index) => String.fromCharCode(65 + index);

// Generate initial data
const generateInitialData = () => {
  const data = {};
  const sampleData = [
    ['Acme Corp', 'John Smith', 'john@acme.com', '$45,000', 'Proposal', 'Follow up Thursday', '', ''],
    ['TechStart Inc', 'Sarah Chen', 'sarah@techstart.io', '$120,000', 'Negotiation', 'Waiting on legal', '', ''],
    ['Global Systems', 'Mike Johnson', 'mike.j@global.com', '$28,000', 'Discovery', 'Demo scheduled', '', ''],
    ['Retail Plus', 'Emma Davis', 'emma@retailplus.com', '$67,000', 'Closed Won', 'Contract signed!', '', ''],
    ['DataFlow', 'Alex Turner', 'alex@dataflow.co', '$95,000', 'Proposal', 'Competitor involved', '', ''],
    ['CloudNine', 'Lisa Park', 'lisa@cloudnine.io', '$52,000', 'Qualification', '', '', ''],
    ['BuildRight', 'Tom Wilson', 'tom@buildright.com', '$33,000', 'Discovery', 'Q2 budget', '', ''],
    ['FinanceHub', 'Rachel Green', 'rgreen@financehub.com', '$210,000', 'Negotiation', 'Enterprise deal', '', ''],
  ];
  
  sampleData.forEach((row, rowIdx) => {
    row.forEach((value, colIdx) => {
      data[`${getColLetter(colIdx)}${rowIdx + 1}`] = value;
    });
  });
  
  return data;
};

const INITIAL_CELL_COLORS = {
  'A2': 'red',
  'D2': 'red',
  'E1': 'orange',
  'E3': 'yellow',
  'E4': 'green',
  'F4': 'green',
  'F5': 'purple',
  'F7': 'blue',
  'A8': 'red',
  'D8': 'red',
};

export default function SalesColorSheet() {
  const [cellData, setCellData] = useState(generateInitialData);
  const [cellColors, setCellColors] = useState(INITIAL_CELL_COLORS);
  const [colorOrder, setColorOrder] = useState(INITIAL_COLOR_ORDER);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [selectedColumns, setSelectedColumns] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingCell, setEditingCell] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [colWidths, setColWidths] = useState(() => 
    Object.fromEntries(Array.from({ length: NUM_COLS }, (_, i) => [getColLetter(i), 120]))
  );
  const [resizing, setResizing] = useState(null);
  const [draggedColor, setDraggedColor] = useState(null);
  const [rowOrder, setRowOrder] = useState(() => Array.from({ length: NUM_ROWS }, (_, i) => i + 1));
  const [editingColor, setEditingColor] = useState(null);
  const [lastSelectedCol, setLastSelectedCol] = useState(null);
  const [lastSelectedRow, setLastSelectedRow] = useState(null);
  const inputRef = useRef(null);
  const colorInputRef = useRef(null);

  // Close context menu and color editor on click outside
  useEffect(() => {
    const handleClick = (e) => {
      // Don't close color editor if clicking on a color chip or inside the editor
      if (!e.target.closest('.color-editor') && !e.target.closest('.color-chip')) {
        setEditingColor(null);
      }
      setContextMenu(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Handle column resizing
  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e) => {
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(50, resizing.startWidth + diff);
      setColWidths(prev => ({ ...prev, [resizing.col]: newWidth }));
    };
    const handleMouseUp = () => setResizing(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  // Auto-sort when color order changes while columns are selected
  useEffect(() => {
    if (selectedColumns.size > 0) {
      const primaryCol = [...selectedColumns][0];
      setRowOrder(prev => {
        const sorted = [...prev].sort((a, b) => {
          const colorA = cellColors[`${primaryCol}${a}`];
          const colorB = cellColors[`${primaryCol}${b}`];
          const priorityA = colorOrder.findIndex(c => c.id === colorA);
          const priorityB = colorOrder.findIndex(c => c.id === colorB);
          return (priorityA === -1 ? 999 : priorityA) - (priorityB === -1 ? 999 : priorityB);
        });
        return sorted;
      });
    }
  }, [colorOrder, selectedColumns, cellColors]);

  const handleCellClick = (cellId, e) => {
    setSelectedColumns(new Set());
    setSelectedRows(new Set());
    setLastSelectedCol(null);
    setLastSelectedRow(null);
    if (e.shiftKey) {
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cellId)) newSet.delete(cellId);
        else newSet.add(cellId);
        return newSet;
      });
    } else {
      setSelectedCells(new Set([cellId]));
    }
  };

  const handleColumnSelect = (colLetter, e) => {
    setSelectedCells(new Set());
    setSelectedRows(new Set());
    setLastSelectedRow(null);
    
    if (e.shiftKey && lastSelectedCol) {
      // Range select
      const startIdx = lastSelectedCol.charCodeAt(0) - 65;
      const endIdx = colLetter.charCodeAt(0) - 65;
      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      const newSelection = new Set();
      for (let i = minIdx; i <= maxIdx; i++) {
        newSelection.add(getColLetter(i));
      }
      setSelectedColumns(newSelection);
    } else if (e.metaKey || e.ctrlKey) {
      // Toggle select
      setSelectedColumns(prev => {
        const newSet = new Set(prev);
        if (newSet.has(colLetter)) newSet.delete(colLetter);
        else newSet.add(colLetter);
        return newSet;
      });
      setLastSelectedCol(colLetter);
    } else {
      // Single select
      setSelectedColumns(new Set([colLetter]));
      setLastSelectedCol(colLetter);
    }
  };

  const handleRowSelect = (visualIndex, e) => {
    setSelectedCells(new Set());
    setSelectedColumns(new Set());
    setLastSelectedCol(null);
    
    if (e.shiftKey && lastSelectedRow !== null) {
      // Range select
      const minIdx = Math.min(lastSelectedRow, visualIndex);
      const maxIdx = Math.max(lastSelectedRow, visualIndex);
      const newSelection = new Set();
      for (let i = minIdx; i <= maxIdx; i++) {
        newSelection.add(i);
      }
      setSelectedRows(newSelection);
    } else if (e.metaKey || e.ctrlKey) {
      // Toggle select
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(visualIndex)) newSet.delete(visualIndex);
        else newSet.add(visualIndex);
        return newSet;
      });
      setLastSelectedRow(visualIndex);
    } else {
      // Single select
      setSelectedRows(new Set([visualIndex]));
      setLastSelectedRow(visualIndex);
    }
  };

  const handleCellDoubleClick = (cellId) => {
    setEditingCell(cellId);
  };

  const handleCellChange = (cellId, value) => {
    setCellData(prev => ({ ...prev, [cellId]: value }));
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e, cellId) => {
    if (e.key === 'Enter') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const col = cellId.charAt(0);
      const row = parseInt(cellId.slice(1));
      const colIdx = col.charCodeAt(0) - 65;
      
      if (e.shiftKey) {
        if (colIdx > 0) setEditingCell(`${getColLetter(colIdx - 1)}${row}`);
        else if (row > 1) setEditingCell(`${getColLetter(NUM_COLS - 1)}${row - 1}`);
      } else {
        if (colIdx < NUM_COLS - 1) setEditingCell(`${getColLetter(colIdx + 1)}${row}`);
        else if (row < NUM_ROWS) setEditingCell(`${getColLetter(0)}${row + 1}`);
      }
    }
  };

  const handleContextMenu = (e, cellId) => {
    e.preventDefault();
    if (!selectedCells.has(cellId) && selectedColumns.size === 0 && selectedRows.size === 0) {
      setSelectedCells(new Set([cellId]));
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const setCellColor = (colorId) => {
    setCellColors(prev => {
      const newColors = { ...prev };
      const cellsToColor = new Set();
      
      if (selectedColumns.size > 0) {
        selectedColumns.forEach(col => {
          rowOrder.forEach(row => cellsToColor.add(`${col}${row}`));
        });
      } else if (selectedRows.size > 0) {
        selectedRows.forEach(visualIndex => {
          const rowNum = rowOrder[visualIndex];
          for (let i = 0; i < NUM_COLS; i++) {
            cellsToColor.add(`${getColLetter(i)}${rowNum}`);
          }
        });
      } else {
        selectedCells.forEach(c => cellsToColor.add(c));
      }
      
      cellsToColor.forEach(cellId => {
        if (colorId === 'none') delete newColors[cellId];
        else newColors[cellId] = colorId;
      });
      
      return newColors;
    });
    setContextMenu(null);
  };

  const getColorPriority = (colorId) => {
    const idx = colorOrder.findIndex(c => c.id === colorId);
    return idx === -1 ? 999 : idx;
  };

  const sortByColor = () => {
    if (selectedColumns.size > 0) {
      const primaryCol = [...selectedColumns][0];
      const newOrder = [...rowOrder].sort((a, b) => {
        const colorA = cellColors[`${primaryCol}${a}`];
        const colorB = cellColors[`${primaryCol}${b}`];
        return getColorPriority(colorA) - getColorPriority(colorB);
      });
      setRowOrder(newOrder);
    }
  };

  const sortByContent = (direction = 'asc') => {
    if (selectedColumns.size > 0) {
      const primaryCol = [...selectedColumns][0];
      const newOrder = [...rowOrder].sort((a, b) => {
        const valA = String(cellData[`${primaryCol}${a}`] || '').toLowerCase();
        const valB = String(cellData[`${primaryCol}${b}`] || '').toLowerCase();
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
      setRowOrder(newOrder);
    }
  };

  // Color management functions
  const addNewColor = () => {
    const newId = `color-${Date.now()}`;
    // Generate a random hex color
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    setColorOrder(prev => [...prev, {
      id: newId,
      hex: randomColor,
      label: 'New Color'
    }]);
    setEditingColor(newId);
  };

  const removeColor = (colorId) => {
    setColorOrder(prev => prev.filter(c => c.id !== colorId));
    // Also remove this color from any cells that have it
    setCellColors(prev => {
      const newColors = { ...prev };
      Object.keys(newColors).forEach(key => {
        if (newColors[key] === colorId) delete newColors[key];
      });
      return newColors;
    });
    setEditingColor(null);
  };

  const updateColor = (colorId, updates) => {
    setColorOrder(prev => prev.map(c => 
      c.id === colorId ? { ...c, ...updates } : c
    ));
  };

  const startResize = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({ col, startX: e.clientX, startWidth: colWidths[col] });
  };

  const getCellColorHex = (cellId) => {
    const colorId = cellColors[cellId];
    return colorOrder.find(c => c.id === colorId)?.hex || null;
  };

  // Drag and drop for color reordering
  const handleColorDragStart = (e, colorId) => {
    setDraggedColor(colorId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColorDragOver = (e, targetColorId) => {
    e.preventDefault();
    if (draggedColor && draggedColor !== targetColorId) {
      setColorOrder(prev => {
        const newOrder = [...prev];
        const dragIdx = newOrder.findIndex(c => c.id === draggedColor);
        const targetIdx = newOrder.findIndex(c => c.id === targetColorId);
        const [removed] = newOrder.splice(dragIdx, 1);
        newOrder.splice(targetIdx, 0, removed);
        return newOrder;
      });
    }
  };

  const handleColorDragEnd = () => {
    setDraggedColor(null);
  };

  const isCellSelected = (cellId, visualRowIndex) => {
    if (selectedCells.has(cellId)) return true;
    const col = cellId.charAt(0);
    if (selectedColumns.has(col)) return true;
    if (selectedRows.has(visualRowIndex)) return true;
    return false;
  };

  return (
    <div className={`min-h-screen bg-[#0a0a0b] text-[#e5e5e5] p-6 ${resizing ? 'select-none' : ''}`} style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">ColorSheets</h1>
        </div>
        <p className="text-[#666] text-sm ml-11">Click column/row headers to select. Drag colors below to set sort priority.</p>
      </div>

      {/* Draggable Color Key with editing */}
      <div className="mb-4 p-3 bg-[#141416] rounded-xl border border-[#2a2a2e]">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-[#666] uppercase tracking-wider">Color Priority</span>
          <span className="text-xs text-[#444]">← Drag to reorder • Click to edit</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {colorOrder.map((color, index) => (
            <div
              key={color.id}
              draggable
              onDragStart={(e) => handleColorDragStart(e, color.id)}
              onDragOver={(e) => handleColorDragOver(e, color.id)}
              onDragEnd={handleColorDragEnd}
              onClick={(e) => { e.stopPropagation(); setEditingColor(editingColor === color.id ? null : color.id); }}
              className={`color-chip relative flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
                draggedColor === color.id 
                  ? 'opacity-50 border-orange-500 bg-orange-500/10' 
                  : editingColor === color.id
                  ? 'border-orange-500 bg-[#1f1f23]'
                  : 'border-[#333] bg-[#1a1a1c] hover:border-[#444]'
              }`}
            >
              <span className="text-xs text-[#555] font-mono w-4">{index + 1}</span>
              <div className="w-4 h-4 rounded" style={{ backgroundColor: color.hex }} />
              <span className="text-xs text-[#888]">{color.label}</span>
              
              {/* Color Editor Popover */}
              {editingColor === color.id && (
                <div 
                  className="color-editor absolute top-full left-0 mt-2 p-3 rounded-xl shadow-2xl z-50 min-w-[220px] backdrop-blur-xl"
                  style={{ 
                    backgroundColor: 'rgba(255, 252, 250, 0.92)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.03)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3">
                    <label className="text-xs text-[#666] uppercase tracking-wider block mb-1">Label</label>
                    <input
                      type="text"
                      value={color.label}
                      onChange={(e) => updateColor(color.id, { label: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white/70 border border-black/10 rounded-md text-sm text-[#333] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-[#666] uppercase tracking-wider block mb-1">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={colorInputRef}
                        type="color"
                        value={color.hex.startsWith('#') ? color.hex : '#888888'}
                        onChange={(e) => updateColor(color.id, { hex: e.target.value })}
                        className="w-10 h-8 rounded cursor-pointer border border-black/10"
                      />
                      <input
                        type="text"
                        value={color.hex}
                        onChange={(e) => updateColor(color.id, { hex: e.target.value })}
                        className="flex-1 px-2 py-1.5 bg-white/70 border border-black/10 rounded-md text-sm text-[#333] font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingColor(null)}
                      className="flex-1 px-3 py-1.5 bg-black/5 text-[#444] rounded-md text-sm hover:bg-black/10 transition-colors font-medium"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => removeColor(color.id)}
                      className="px-3 py-1.5 bg-red-500/10 text-red-600 rounded-md text-sm hover:bg-red-500/20 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Add Color Button */}
          <button
            onClick={addNewColor}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#444] text-[#666] hover:border-[#666] hover:text-[#888] transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="text-xs">Add Color</span>
          </button>
        </div>
      </div>

      {/* Sort Controls - show when columns selected */}
      {selectedColumns.size > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-xl border border-orange-500/30">
          <span className="text-sm text-orange-300">
            {selectedColumns.size === 1 
              ? `Column ${[...selectedColumns][0]} selected`
              : `Columns ${[...selectedColumns].join(', ')} selected`
            }
          </span>
          <div className="h-4 w-px bg-orange-500/30" />
          <button
            onClick={sortByColor}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30 transition-all"
          >
            <div className="flex gap-0.5">
              {colorOrder.slice(0, 4).map(c => (
                <div key={c.id} className="w-2 h-2 rounded-sm" style={{ backgroundColor: c.hex }} />
              ))}
            </div>
            Sort by Color
          </button>
          <button
            onClick={() => sortByContent('asc')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-[#1a1a1c] border border-[#333] text-[#999] hover:border-[#444] transition-all"
          >
            Sort A→Z
          </button>
          <button
            onClick={() => sortByContent('desc')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-[#1a1a1c] border border-[#333] text-[#999] hover:border-[#444] transition-all"
          >
            Sort Z→A
          </button>
          <button
            onClick={() => { setSelectedColumns(new Set()); setSelectedCells(new Set()); setSelectedRows(new Set()); }}
            className="ml-auto px-3 py-1.5 rounded-md text-sm text-[#666] hover:text-[#999] transition-all"
          >
            Clear Selection
          </button>
        </div>
      )}

      {selectedRows.size > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500/10 to-teal-500/10 rounded-xl border border-blue-500/30">
          <span className="text-sm text-blue-300">
            {selectedRows.size === 1 
              ? `Row ${[...selectedRows][0] + 1} selected`
              : `Rows ${[...selectedRows].map(i => i + 1).sort((a,b) => a-b).join(', ')} selected`
            }
          </span>
          <button
            onClick={() => { setSelectedRows(new Set()); setSelectedCells(new Set()); setSelectedColumns(new Set()); }}
            className="ml-auto px-3 py-1.5 rounded-md text-sm text-[#666] hover:text-[#999] transition-all"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-[#2a2a2e] rounded-xl overflow-hidden bg-[#111113] shadow-2xl">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full border-collapse" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#18181b]">
                {/* Corner cell */}
                <th className="w-12 min-w-[48px] p-0 border-r border-b border-[#2a2a2e] bg-[#18181b]">
                  <div className="h-9 flex items-center justify-center text-[#444]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4l16 16M4 4v6M4 4h6" />
                    </svg>
                  </div>
                </th>
                {/* Column headers A, B, C... */}
                {Array.from({ length: NUM_COLS }, (_, i) => getColLetter(i)).map((col) => (
                  <th 
                    key={col} 
                    className={`p-0 border-r border-b border-[#2a2a2e] relative transition-colors ${
                      selectedColumns.has(col) ? 'bg-orange-500/20' : 'bg-[#18181b]'
                    }`}
                    style={{ width: colWidths[col], minWidth: colWidths[col] }}
                  >
                    <div 
                      className={`h-9 flex items-center justify-center cursor-pointer hover:bg-[#252528] transition-colors ${
                        selectedColumns.has(col) ? 'text-orange-300' : 'text-[#888]'
                      }`}
                      onClick={(e) => handleColumnSelect(col, e)}
                    >
                      <span className="text-sm font-semibold">{col}</span>
                    </div>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize group hover:bg-orange-500/30 transition-colors flex items-center justify-center"
                      onMouseDown={(e) => startResize(e, col)}
                    >
                      <div className="w-0.5 h-4 bg-[#444] group-hover:bg-orange-500 transition-colors rounded-full" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowOrder.map((rowNum, visualIndex) => (
                <tr key={rowNum} className="group">
                  {/* Row number header - shows visual position, not data ID */}
                  <td 
                    className={`p-0 border-r border-b border-[#2a2a2e] sticky left-0 transition-colors cursor-pointer ${
                      selectedRows.has(visualIndex) ? 'bg-blue-500/20' : 'bg-[#141416]'
                    }`}
                    onClick={(e) => handleRowSelect(visualIndex, e)}
                  >
                    <div className={`h-8 flex items-center justify-center hover:bg-[#252528] transition-colors ${
                      selectedRows.has(visualIndex) ? 'text-blue-300' : 'text-[#555]'
                    }`}>
                      <span className="text-xs font-medium">{visualIndex + 1}</span>
                    </div>
                  </td>
                  {/* Data cells */}
                  {Array.from({ length: NUM_COLS }, (_, i) => getColLetter(i)).map((col) => {
                    const cellId = `${col}${rowNum}`;
                    const isSelected = isCellSelected(cellId, visualIndex);
                    const isEditing = editingCell === cellId;
                    const bgColor = getCellColorHex(cellId);
                    
                    return (
                      <td 
                        key={cellId} 
                        className="p-0 border-r border-b border-[#1f1f23]"
                        style={{ width: colWidths[col], minWidth: colWidths[col] }}
                      >
                        <div 
                          className={`h-8 px-2 flex items-center cursor-cell transition-all ${
                            isSelected ? 'ring-2 ring-inset ring-orange-500' : ''
                          }`}
                          style={{
                            backgroundColor: bgColor ? `${bgColor}30` : 'transparent',
                            borderLeft: bgColor ? `3px solid ${bgColor}` : '3px solid transparent',
                          }}
                          onClick={(e) => {
                            if (isEditing) return;
                            e.stopPropagation();
                            setSelectedColumns(new Set());
                            setSelectedRows(new Set());
                            
                            if (e.shiftKey || e.metaKey || e.ctrlKey) {
                              // Multi-select mode
                              setSelectedCells(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(cellId)) newSet.delete(cellId);
                                else newSet.add(cellId);
                                return newSet;
                              });
                              setEditingCell(null);
                            } else {
                              // Single click to edit
                              setSelectedCells(new Set([cellId]));
                              setEditingCell(cellId);
                            }
                          }}
                          onContextMenu={(e) => handleContextMenu(e, cellId)}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="text"
                              value={cellData[cellId] || ''}
                              onChange={(e) => handleCellChange(cellId, e.target.value)}
                              onBlur={handleCellBlur}
                              onKeyDown={(e) => handleKeyDown(e, cellId)}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-full h-full bg-transparent outline-none text-sm text-[#e5e5e5]"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm text-[#ccc] truncate">{cellData[cellId] || ''}</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed rounded-xl shadow-2xl overflow-hidden z-50 py-2 backdrop-blur-xl"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y, 
            minWidth: 200, 
            backgroundColor: 'rgba(255, 252, 250, 0.92)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.03)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-xs text-[#666] uppercase tracking-wider flex items-center justify-between">
            <span>Set Color</span>
            {(selectedColumns.size > 0 || selectedRows.size > 0 || selectedCells.size > 1) && (
              <span className="bg-orange-500/20 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                {selectedColumns.size > 0 
                  ? `Col${selectedColumns.size > 1 ? 's' : ''} ${[...selectedColumns].join(', ')}` 
                  : selectedRows.size > 0 
                  ? `Row${selectedRows.size > 1 ? 's' : ''} ${[...selectedRows].map(i => i + 1).join(', ')}` 
                  : `${selectedCells.size} cells`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5 px-2 pb-2 pt-1">
            {colorOrder.map(color => (
              <button
                key={color.id}
                onClick={() => setCellColor(color.id)}
                className="w-8 h-8 rounded-lg transition-all hover:scale-110 hover:shadow-lg relative group border-2 border-white/50 hover:border-white shadow-sm"
                style={{ backgroundColor: color.hex }}
                title={color.label}
              />
            ))}
          </div>
          <div className="border-t border-black/10 mt-2 pt-1">
            <button
              onClick={() => setCellColor('none')}
              className="w-full px-3 py-2 text-left text-sm text-[#555] hover:bg-black/5 transition-colors flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Clear Color
            </button>
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div className="mt-4 text-center text-xs text-[#444]">
        <span className="inline-flex items-center gap-4">
          <span>Click cell to edit</span>
          <span className="w-1 h-1 rounded-full bg-[#333]" />
          <span>Shift+click to multi-select</span>
          <span className="w-1 h-1 rounded-full bg-[#333]" />
          <span>Right-click to color</span>
        </span>
      </div>
    </div>
  );
}
