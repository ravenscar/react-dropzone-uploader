export type StatusValue =
  | "rejected_file_type"
  | "rejected_max_files"
  | "preparing"
  | "error_file_size"
  | "error_validation"
  | "ready"
  | "started"
  | "getting_upload_params"
  | "error_upload_params"
  | "uploading"
  | "exception_upload"
  | "aborted"
  | "restarted"
  | "removed"
  | "error_upload"
  | "headers_received"
  | "done";

export type MethodValue =
  | "delete"
  | "get"
  | "head"
  | "options"
  | "patch"
  | "post"
  | "put"
  | "DELETE"
  | "GET"
  | "HEAD"
  | "OPTIONS"
  | "PATCH"
  | "POST"
  | "PUT";

export interface IMeta {
  id: string;
  status: StatusValue;
  type: string; // MIME type, example: `image/*`
  name: string;
  uploadedDate: string; // ISO string
  percent: number;
  size: number; // bytes
  lastModifiedDate: string; // ISO string
  previewUrl?: string; // from URL.createObjectURL
  duration?: number; // seconds
  width?: number;
  height?: number;
  videoWidth?: number;
  videoHeight?: number;
  validationError?: any;
}

export interface IFileWithMeta {
  file: File;
  meta: IMeta;
  cancel: () => void;
  restart: () => void;
  remove: () => void;
  xhr?: XMLHttpRequest;
}

export interface IExtra {
  active: boolean;
  reject: boolean;
  dragged: DataTransferItem[];
  accept: string;
  multiple: boolean;
  minSizeBytes: number;
  maxSizeBytes: number;
  maxFiles: number;
}

export interface IUploadParams {
  url: string;
  method?: MethodValue;
  body?: string | FormData | ArrayBuffer | Blob | File | URLSearchParams;
  fields?: { [name: string]: string | Blob };
  headers?: { [name: string]: string };
  meta?: { [name: string]: any };
}

export type CustomizationFunction<T> = (
  allFiles: IFileWithMeta[],
  extra: IExtra
) => T;

export interface IStyleCustomization<T> {
  dropzone?: T | CustomizationFunction<T>;
  dropzoneActive?: T | CustomizationFunction<T>;
  dropzoneReject?: T | CustomizationFunction<T>;
  dropzoneDisabled?: T | CustomizationFunction<T>;
  input?: T | CustomizationFunction<T>;
  inputLabel?: T | CustomizationFunction<T>;
  inputLabelWithFiles?: T | CustomizationFunction<T>;
  preview?: T | CustomizationFunction<T>;
  previewImage?: T | CustomizationFunction<T>;
  submitButtonContainer?: T | CustomizationFunction<T>;
  submitButton?: T | CustomizationFunction<T>;
}

export interface IExtraLayout extends IExtra {
  onFiles(files: File[]): void;
  onCancelFile(file: IFileWithMeta): void;
  onRemoveFile(file: IFileWithMeta): void;
  onRestartFile(file: IFileWithMeta): void;
}

export interface ICommonProps {
  files: IFileWithMeta[];
  extra: IExtra;
}

export type ReactComponent<Props> = (
  props: Props
) => React.ReactNode | React.Component<Props>;
