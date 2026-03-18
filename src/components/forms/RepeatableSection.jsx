import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../common/Button';

export default function RepeatableSection({ title, items = [], onAdd, onRemove, renderItem, addButtonText = 'Add Entry', maxItems }) {
  return (
    <div className="space-y-4">
      {title && <div className="flex justify-between items-center"><h3 className="text-base font-semibold text-gray-900">{title}</h3><span className="text-sm text-gray-500">{items.length}{maxItems ? ` / ${maxItems}` : ''} entries</span></div>}
      {items.length === 0 && <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"><p className="text-sm text-gray-500">No entries yet. Add one below.</p></div>}
      {items.map((item, idx) => (
        <div key={idx} className="relative border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
          <button type="button" onClick={() => onRemove(idx)} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
          <div className="pr-8">{renderItem(item, idx)}</div>
        </div>
      ))}
      {(!maxItems || items.length < maxItems) && (
        <Button type="button" variant="secondary" size="sm" onClick={onAdd} className="w-full border-dashed"><Plus className="h-4 w-4 mr-1" />{addButtonText}</Button>
      )}
    </div>
  );
}
