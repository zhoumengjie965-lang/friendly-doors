/**
 * OrgTreeSelect — A hierarchical org/dept picker.
 *
 * Displays a flat list of top-level orgs; hovering an item that has children
 * shows a sub-menu (flyout) with those children listed.
 *
 * Usage:
 *   <OrgTreeSelect
 *     orgs={[{ id, name, parent_id }]}
 *     value="org-id"          // currently selected id, or "all"
 *     onValueChange={v => …}
 *     placeholder="所属部门：全部"
 *     showAll={true}          // whether to show "全部" option
 *     allLabel="所属部门：全部"
 *   />
 */

import { useRef, useState } from "react";
import { ChevronRight, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrgNode {
  id: string;
  name: string;
  parent_id?: string | null;
}

interface Props {
  orgs: OrgNode[];
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  showAll?: boolean;
  allLabel?: string;
  className?: string;
  triggerClassName?: string;
}

export default function OrgTreeSelect({
  orgs,
  value,
  onValueChange,
  placeholder = "选择部门...",
  showAll = true,
  allLabel = "全部",
  className,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build tree structure
  const roots = orgs.filter(o => !o.parent_id);
  const childrenOf = (parentId: string) => orgs.filter(o => o.parent_id === parentId);

  const selectedLabel =
    value === "all" || value === ""
      ? (showAll ? allLabel : placeholder)
      : orgs.find(o => o.id === value)?.name ?? placeholder;

  const select = (id: string) => {
    onValueChange(id);
    setOpen(false);
    setHoveredId(null);
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/50 transition-colors min-w-[140px] justify-between",
          triggerClassName
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setHoveredId(null); }} />

          <div className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-visible min-w-[160px]">
            {/* All option */}
            {showAll && (
              <button
                type="button"
                onClick={() => select("all")}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors rounded-t-lg",
                  (value === "all" || value === "") && "text-primary font-medium"
                )}
              >
                {(value === "all" || value === "") && <Check className="w-3.5 h-3.5 shrink-0" />}
                {!(value === "all" || value === "") && <span className="w-3.5 shrink-0" />}
                {allLabel}
              </button>
            )}

            {roots.map(root => {
              const children = childrenOf(root.id);
              const hasChildren = children.length > 0;
              const isSelected = value === root.id;
              const isHovered = hoveredId === root.id;

              return (
                <div
                  key={root.id}
                  className="relative"
                  onMouseEnter={() => hasChildren && setHoveredId(root.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    type="button"
                    onClick={() => select(root.id)}
                    className={cn(
                      "flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors",
                      isSelected && "text-primary font-medium",
                      isHovered && hasChildren && "bg-muted/40"
                    )}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 shrink-0" />}
                    <span className="flex-1 truncate">{root.name}</span>
                    {hasChildren && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  </button>

                  {/* Sub-menu flyout */}
                  {hasChildren && isHovered && (
                    <div
                      className="absolute left-full top-0 ml-0.5 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[160px] z-50"
                      onMouseEnter={() => setHoveredId(root.id)}
                    >
                      {children.map(child => {
                        const grandChildren = childrenOf(child.id);
                        const hasGrand = grandChildren.length > 0;
                        const childSelected = value === child.id;
                        const isChildHovered = hoveredId === child.id;

                        return (
                          <div
                            key={child.id}
                            className="relative"
                            onMouseEnter={() => hasGrand && setHoveredId(child.id)}
                            onMouseLeave={() => hasGrand && setHoveredId(root.id)}
                          >
                            <button
                              type="button"
                              onClick={() => select(child.id)}
                              className={cn(
                                "flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors",
                                childSelected && "text-primary font-medium",
                                isChildHovered && hasGrand && "bg-muted/40"
                              )}
                            >
                              {childSelected ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 shrink-0" />}
                              <span className="flex-1 truncate">{child.name}</span>
                              {hasGrand && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                            </button>

                            {/* Grandchild flyout */}
                            {hasGrand && isChildHovered && (
                              <div className="absolute left-full top-0 ml-0.5 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[160px] z-50">
                                {grandChildren.map(gc => (
                                  <button
                                    key={gc.id}
                                    type="button"
                                    onClick={() => select(gc.id)}
                                    className={cn(
                                      "flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors",
                                      value === gc.id && "text-primary font-medium"
                                    )}
                                  >
                                    {value === gc.id ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span className="w-3.5 shrink-0" />}
                                    <span className="flex-1 truncate">{gc.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
