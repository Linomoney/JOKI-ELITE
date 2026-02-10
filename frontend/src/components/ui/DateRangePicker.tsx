"use client";
import { useState } from "react";
import { Calendar, X } from "lucide-react";

interface DateRangePickerProps {
  value: { start: Date | null; end: Date | null };
  onChange: (range: { start: Date | null; end: Date | null }) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className = "" }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : null;
    onChange({ ...value, start: newDate });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : null;
    onChange({ ...value, end: newDate });
  };

  const handleClear = () => {
    onChange({ start: null, end: null });
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm flex items-center gap-2 hover:border-red-600/30 transition-colors"
      >
        <Calendar size={16} />
        <span className="text-zinc-400">
          {value.start && value.end
            ? `${formatDate(value.start)} - ${formatDate(value.end)}`
            : "Select date range"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[#0c0c0c] border border-zinc-800 rounded-xl shadow-lg z-50 p-4 min-w-[300px]">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 mb-2">Start Date</label>
              <input
                type="date"
                value={value.start ? value.start.toISOString().split("T")[0] : ""}
                onChange={handleStartChange}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-400 mb-2">End Date</label>
              <input
                type="date"
                value={value.end ? value.end.toISOString().split("T")[0] : ""}
                onChange={handleEndChange}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-black rounded-lg hover:bg-red-700"
              >
                Apply
              </button>
              <button
                onClick={handleClear}
                className="flex-1 px-3 py-2 bg-zinc-800 text-zinc-400 text-xs font-black rounded-lg hover:bg-zinc-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}