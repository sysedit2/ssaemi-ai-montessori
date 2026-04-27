"use client";

import { useState, useEffect } from "react";
import { getChildren, addChild, type Child, type AgeGroup } from "@/lib/local-store";

interface Props {
  selectedId: string | null;
  onSelect: (child: Child) => void;
}

export default function ChildSelector({ selectedId, onSelect }: Props) {
  const [children, setChildren] = useState<Child[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [nickname, setNickname] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("3-6");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChildren(getChildren());
  }, []);

  function handleAdd() {
    if (!nickname.trim()) { setError("닉네임을 입력해주세요."); return; }
    setError(null);
    const child = addChild({ nickname: nickname.trim(), age_group: ageGroup });
    setChildren(getChildren());
    onSelect(child);
    setIsAdding(false);
    setNickname("");
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">아동 선택</h3>
        <button
          onClick={() => { setIsAdding(!isAdding); setError(null); }}
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
        >
          {isAdding ? "취소" : "+ 새 아동 추가"}
        </button>
      </div>

      {isAdding && (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="닉네임 (예: 민준이)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            autoFocus
          />
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option value="3-6">3–6세 (Children's House)</option>
            <option value="6-9">6–9세 (Lower Elementary)</option>
            <option value="9-12">9–12세 (Upper Elementary)</option>
          </select>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={handleAdd}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
          >
            추가
          </button>
        </div>
      )}

      {children.length === 0 && !isAdding ? (
        <p className="text-xs text-slate-400 text-center py-4">
          등록된 아동이 없습니다.<br />위에서 추가해주세요.
        </p>
      ) : (
        <div className="space-y-2">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => onSelect(child)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition text-left ${
                selectedId === child.id
                  ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">👦</span>
                <span className="text-sm font-medium">{child.nickname}</span>
              </div>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {child.age_group}세
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
