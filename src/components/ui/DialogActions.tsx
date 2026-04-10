/**
 * 弹窗底部操作栏，统一样式：border-t + px-4 py-3 + flex gap-2。
 * 按钮由调用方传入，需自行加 flex-1 实现等宽。
 */
export function DialogActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 border-t px-4 py-3 flex gap-2">
      {children}
    </div>
  )
}
