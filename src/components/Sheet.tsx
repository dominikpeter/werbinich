"use client";
import { forwardRef } from "react";

/** a bottom sheet on a native <dialog>: Escape and a tap outside close it, focus stays inside while open */
export const Sheet = forwardRef<HTMLDialogElement, { children: React.ReactNode; testId?: string }>(function Sheet({ children, testId }, ref) {
  return (
    <dialog
      ref={ref}
      data-testid={testId}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-canvas/70 backdrop:backdrop-blur-sm"
    >
      <div className="rise glass sheet-pad mx-auto flex w-full max-w-xl flex-col gap-4 rounded-t-3xl p-5">{children}</div>
    </dialog>
  );
});
