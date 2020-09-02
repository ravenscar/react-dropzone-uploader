import * as React from "react";

import { ICommonProps } from "./types";

export interface IInputProps extends ICommonProps {
  className?: string;
  labelClassName?: string;
  labelWithFilesClassName?: string;
  style?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  labelWithFilesStyle?: React.CSSProperties;
  getFilesFromEvent: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<File[]>;
  accept: string;
  multiple: boolean;
  disabled: boolean;
  content?: React.ReactNode;
  withFilesContent?: React.ReactNode;
  onFiles: (files: File[]) => void;
}

export const Input = (props: IInputProps) => {
  const {
    className,
    labelClassName,
    labelWithFilesClassName,
    style,
    labelStyle,
    labelWithFilesStyle,
    getFilesFromEvent,
    accept,
    multiple,
    disabled,
    content,
    withFilesContent,
    onFiles,
    files,
  } = props;

  return (
    <label
      className={files.length > 0 ? labelWithFilesClassName : labelClassName}
      style={files.length > 0 ? labelWithFilesStyle : labelStyle}
    >
      {files.length > 0 ? withFilesContent : content}
      <input
        className={className}
        style={style}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={async (e) => {
          const target = e.target;
          const chosenFiles = await getFilesFromEvent(e);
          onFiles(chosenFiles);
          //@ts-ignore
          target.value = null;
        }}
      />
    </label>
  );
};
