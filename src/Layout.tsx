import * as React from "react";

import { IExtraLayout, IFileWithMeta } from "./types";

export interface ILayoutProps {
  files: IFileWithMeta[];
  extra: IExtraLayout;
  input: React.ReactNode;
  previews: React.ReactNode[] | null;
  submitButton: React.ReactNode;
  dropzoneProps: {
    ref: React.RefObject<HTMLDivElement>;
    className: string;
    style?: React.CSSProperties;
    onDragEnter(event: React.DragEvent<HTMLElement>): void;
    onDragOver(event: React.DragEvent<HTMLElement>): void;
    onDragLeave(event: React.DragEvent<HTMLElement>): void;
    onDrop(event: React.DragEvent<HTMLElement>): void;
  };
}

export const Layout = (props: ILayoutProps) => {
  const {
    input,
    previews,
    submitButton,
    dropzoneProps,
    files,
    extra: { maxFiles },
  } = props;

  return (
    <div {...dropzoneProps}>
      {previews}

      {files.length < maxFiles && input}

      {files.length > 0 && submitButton}
    </div>
  );
};
