import * as React from "react";

import { Layout, ILayoutProps } from "./Layout";
import { Input, IInputProps } from "./Input";
import { Preview, IPreviewProps } from "./Preview";
import { SubmitButton, ISubmitButtonProps } from "./SubmitButton";
import {
  formatBytes,
  formatDuration,
  accepts,
  resolveValue,
  mergeStyles,
  defaultClassNames,
  getFilesFromEvent as defaultGetFilesFromEvent,
} from "./utils";
import {
  IFileWithMeta,
  IExtraLayout,
  IExtra,
  IUploadParams,
  StatusValue,
  CustomizationFunction,
  IStyleCustomization,
  ReactComponent,
} from "./types";

export interface IDropzoneProps {
  onChangeStatus?(
    file: IFileWithMeta,
    status: StatusValue,
    allFiles: IFileWithMeta[]
  ): { meta: { [name: string]: any } } | void;
  getUploadParams?(file: IFileWithMeta): IUploadParams | Promise<IUploadParams>;
  onSubmit?(successFiles: IFileWithMeta[], allFiles: IFileWithMeta[]): void;

  getFilesFromEvent?: (
    event: React.DragEvent<HTMLElement> | React.ChangeEvent<HTMLInputElement>
  ) => Promise<File[]> | File[];
  getDataTransferItemsFromEvent?: (
    event: React.DragEvent<HTMLElement>
  ) => Promise<DataTransferItem[]> | DataTransferItem[];

  accept: string;
  multiple: boolean;
  minSizeBytes: number;
  maxSizeBytes: number;
  maxFiles: number;

  validate?(file: IFileWithMeta): any; // usually a string, but can be anything

  autoUpload: boolean;
  timeout?: number;

  initialFiles?: File[];

  /* component customization */
  disabled: boolean | CustomizationFunction<boolean>;

  canCancel: boolean | CustomizationFunction<boolean>;
  canRemove: boolean | CustomizationFunction<boolean>;
  canRestart: boolean | CustomizationFunction<boolean>;

  inputContent: React.ReactNode | CustomizationFunction<React.ReactNode>;
  inputWithFilesContent:
    | React.ReactNode
    | CustomizationFunction<React.ReactNode>;

  submitButtonDisabled: boolean | CustomizationFunction<boolean>;
  submitButtonContent: React.ReactNode | CustomizationFunction<React.ReactNode>;

  classNames: IStyleCustomization<string>;
  styles: IStyleCustomization<React.CSSProperties>;
  addClassNames: IStyleCustomization<string>;

  /* component injection */
  LayoutComponent?: ReactComponent<ILayoutProps>;
  PreviewComponent?: ReactComponent<IPreviewProps>;
  InputComponent?: ReactComponent<IInputProps>;
  SubmitButtonComponent?: ReactComponent<ISubmitButtonProps>;
}

export class Dropzone extends React.Component<
  IDropzoneProps,
  { active: boolean; dragged: (File | DataTransferItem)[] }
> {
  static defaultProps: IDropzoneProps;
  protected files: IFileWithMeta[];
  protected mounted: boolean;
  protected dropzone: React.RefObject<HTMLDivElement>;
  protected dragTimeoutId?: number;

  constructor(props: IDropzoneProps) {
    super(props);
    this.state = {
      active: false,
      dragged: [],
    };
    this.files = [];
    this.mounted = true;
    this.dropzone = React.createRef();
  }

  componentDidMount() {
    if (this.props.initialFiles) this.handleFiles(this.props.initialFiles);
  }

  componentDidUpdate(prevProps: IDropzoneProps) {
    const { initialFiles } = this.props;
    if (prevProps.initialFiles !== initialFiles && initialFiles)
      this.handleFiles(initialFiles);
  }

  componentWillUnmount() {
    this.mounted = false;
    for (const fileWithMeta of this.files) this.handleCancel(fileWithMeta);
  }

  forceUpdate = () => {
    if (this.mounted) super.forceUpdate();
  };

  getFilesFromEvent = () => {
    return this.props.getFilesFromEvent || defaultGetFilesFromEvent;
  };

  getDataTransferItemsFromEvent = () => {
    return this.props.getDataTransferItemsFromEvent || defaultGetFilesFromEvent;
  };

  handleDragEnter = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dragged = (await this.getDataTransferItemsFromEvent()(
      e
    )) as DataTransferItem[];
    this.setState({ active: true, dragged });
  };

  handleDragOver = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(this.dragTimeoutId);
    const dragged = await this.getDataTransferItemsFromEvent()(e);
    this.setState({ active: true, dragged });
  };

  handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // prevents repeated toggling of `active` state when file is dragged over children of uploader
    // see: https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/
    this.dragTimeoutId = window.setTimeout(
      () => this.setState({ active: false, dragged: [] }),
      150
    );
  };

  handleDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ active: false, dragged: [] });
    const files = (await this.getFilesFromEvent()(e)) as File[];
    this.handleFiles(files);
  };

  handleDropDisabled = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ active: false, dragged: [] });
  };

  handleChangeStatus = (fileWithMeta: IFileWithMeta) => {
    if (!this.props.onChangeStatus) return;
    const { meta = {} } =
      this.props.onChangeStatus(
        fileWithMeta,
        fileWithMeta.meta.status,
        this.files
      ) || {};
    if (meta) {
      delete meta.status;
      fileWithMeta.meta = { ...fileWithMeta.meta, ...meta };
      this.forceUpdate();
    }
  };

  handleSubmit = (files: IFileWithMeta[]) => {
    if (this.props.onSubmit) this.props.onSubmit(files, [...this.files]);
  };

  handleCancel = (fileWithMeta: IFileWithMeta) => {
    if (fileWithMeta.meta.status !== "uploading") return;
    fileWithMeta.meta.status = "aborted";
    if (fileWithMeta.xhr) fileWithMeta.xhr.abort();
    this.handleChangeStatus(fileWithMeta);
    this.forceUpdate();
  };

  handleRemove = (fileWithMeta: IFileWithMeta) => {
    const index = this.files.findIndex((f) => f === fileWithMeta);
    if (index !== -1) {
      URL.revokeObjectURL(fileWithMeta.meta.previewUrl || "");
      fileWithMeta.meta.status = "removed";
      this.handleChangeStatus(fileWithMeta);
      this.files.splice(index, 1);
      this.forceUpdate();
    }
  };

  handleRestart = (fileWithMeta: IFileWithMeta) => {
    if (!this.props.getUploadParams) return;

    if (fileWithMeta.meta.status === "ready")
      fileWithMeta.meta.status = "started";
    else fileWithMeta.meta.status = "restarted";
    this.handleChangeStatus(fileWithMeta);

    fileWithMeta.meta.status = "getting_upload_params";
    fileWithMeta.meta.percent = 0;
    this.handleChangeStatus(fileWithMeta);
    this.forceUpdate();
    this.uploadFile(fileWithMeta);
  };

  // expects an array of File objects
  handleFiles = (files: File[]) => {
    files.forEach((f, i) => this.handleFile(f, `${new Date().getTime()}-${i}`));
    const { current } = this.dropzone;
    if (current)
      setTimeout(
        () => current.scroll({ top: current.scrollHeight, behavior: "smooth" }),
        150
      );
  };

  handleFile = async (file: File, id: string) => {
    const { name, size, type, lastModified } = file;
    const {
      minSizeBytes,
      maxSizeBytes,
      maxFiles,
      accept,
      getUploadParams,
      autoUpload,
      validate,
    } = this.props;

    const uploadedDate = new Date().toISOString();
    const lastModifiedDate =
      lastModified && new Date(lastModified).toISOString();
    const fileWithMeta = {
      file,
      meta: {
        name,
        size,
        type,
        lastModifiedDate,
        uploadedDate,
        percent: 0,
        id,
      },
    } as IFileWithMeta;

    // firefox versions prior to 53 return a bogus mime type for file drag events,
    // so files with that mime type are always accepted
    if (file.type !== "application/x-moz-file" && !accepts(file, accept)) {
      fileWithMeta.meta.status = "rejected_file_type";
      this.handleChangeStatus(fileWithMeta);
      return;
    }
    if (this.files.length >= maxFiles) {
      fileWithMeta.meta.status = "rejected_max_files";
      this.handleChangeStatus(fileWithMeta);
      return;
    }

    fileWithMeta.cancel = () => this.handleCancel(fileWithMeta);
    fileWithMeta.remove = () => this.handleRemove(fileWithMeta);
    fileWithMeta.restart = () => this.handleRestart(fileWithMeta);

    fileWithMeta.meta.status = "preparing";
    this.files.push(fileWithMeta);
    this.handleChangeStatus(fileWithMeta);
    this.forceUpdate();

    if (size < minSizeBytes || size > maxSizeBytes) {
      fileWithMeta.meta.status = "error_file_size";
      this.handleChangeStatus(fileWithMeta);
      this.forceUpdate();
      return;
    }

    await this.generatePreview(fileWithMeta);

    if (validate) {
      const error = validate(fileWithMeta);
      if (error) {
        fileWithMeta.meta.status = "error_validation";
        fileWithMeta.meta.validationError = error; // usually a string, but doesn't have to be
        this.handleChangeStatus(fileWithMeta);
        this.forceUpdate();
        return;
      }
    }

    if (getUploadParams) {
      if (autoUpload) {
        this.uploadFile(fileWithMeta);
        fileWithMeta.meta.status = "getting_upload_params";
      } else {
        fileWithMeta.meta.status = "ready";
      }
    } else {
      fileWithMeta.meta.status = "done";
    }
    this.handleChangeStatus(fileWithMeta);
    this.forceUpdate();
  };

  generatePreview = async (fileWithMeta: IFileWithMeta) => {
    const {
      meta: { type },
      file,
    } = fileWithMeta;
    const isImage = type.startsWith("image/");
    const isAudio = type.startsWith("audio/");
    const isVideo = type.startsWith("video/");
    if (!isImage && !isAudio && !isVideo) return;

    const objectUrl = URL.createObjectURL(file);

    const fileCallbackToPromise = (
      fileObj: HTMLImageElement | HTMLAudioElement
    ) => {
      return Promise.race([
        new Promise((resolve) => {
          if (fileObj instanceof HTMLImageElement) fileObj.onload = resolve;
          else fileObj.onloadedmetadata = resolve;
        }),
        new Promise((_, reject) => {
          setTimeout(reject, 1000);
        }),
      ]);
    };

    try {
      if (isImage) {
        const img = new Image();
        img.src = objectUrl;
        fileWithMeta.meta.previewUrl = objectUrl;
        await fileCallbackToPromise(img);
        fileWithMeta.meta.width = img.width;
        fileWithMeta.meta.height = img.height;
      }

      if (isAudio) {
        const audio = new Audio();
        audio.src = objectUrl;
        await fileCallbackToPromise(audio);
        fileWithMeta.meta.duration = audio.duration;
      }

      if (isVideo) {
        const video = document.createElement("video");
        video.src = objectUrl;
        await fileCallbackToPromise(video);
        fileWithMeta.meta.duration = video.duration;
        fileWithMeta.meta.videoWidth = video.videoWidth;
        fileWithMeta.meta.videoHeight = video.videoHeight;
      }
      if (!isImage) URL.revokeObjectURL(objectUrl);
    } catch (e) {
      URL.revokeObjectURL(objectUrl);
    }
    this.forceUpdate();
  };

  uploadFile = async (fileWithMeta: IFileWithMeta) => {
    const { getUploadParams } = this.props;
    if (!getUploadParams) return;
    let params: IUploadParams | null = null;
    try {
      params = await getUploadParams(fileWithMeta);
    } catch (e) {
      console.error("Error Upload Params", e.stack);
    }
    if (params === null) return;
    const {
      url,
      method = "POST",
      body,
      fields = {},
      headers = {},
      meta: extraMeta = {},
    } = params;
    delete extraMeta.status;

    if (!url) {
      fileWithMeta.meta.status = "error_upload_params";
      this.handleChangeStatus(fileWithMeta);
      this.forceUpdate();
      return;
    }

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    xhr.open(method, url, true);

    for (const field of Object.keys(fields))
      formData.append(field, fields[field]);
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    for (const header of Object.keys(headers))
      xhr.setRequestHeader(header, headers[header]);
    fileWithMeta.meta = { ...fileWithMeta.meta, ...extraMeta };

    // update progress (can be used to show progress indicator)
    xhr.upload.addEventListener("progress", (e) => {
      fileWithMeta.meta.percent = (e.loaded * 100.0) / e.total || 100;
      this.forceUpdate();
    });

    xhr.addEventListener("readystatechange", () => {
      // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
      if (xhr.readyState !== 2 && xhr.readyState !== 4) return;

      if (xhr.status === 0 && fileWithMeta.meta.status !== "aborted") {
        fileWithMeta.meta.status = "exception_upload";
        this.handleChangeStatus(fileWithMeta);
        this.forceUpdate();
      }

      if (xhr.status > 0 && xhr.status < 400) {
        fileWithMeta.meta.percent = 100;
        if (xhr.readyState === 2) fileWithMeta.meta.status = "headers_received";
        if (xhr.readyState === 4) fileWithMeta.meta.status = "done";
        this.handleChangeStatus(fileWithMeta);
        this.forceUpdate();
      }

      if (xhr.status >= 400 && fileWithMeta.meta.status !== "error_upload") {
        fileWithMeta.meta.status = "error_upload";
        this.handleChangeStatus(fileWithMeta);
        this.forceUpdate();
      }
    });

    formData.append("file", fileWithMeta.file);
    if (this.props.timeout) xhr.timeout = this.props.timeout;
    xhr.send(body || formData);
    fileWithMeta.xhr = xhr;
    fileWithMeta.meta.status = "uploading";
    this.handleChangeStatus(fileWithMeta);
    this.forceUpdate();
  };

  render() {
    const {
      accept,
      multiple,
      maxFiles,
      minSizeBytes,
      maxSizeBytes,
      onSubmit,
      getUploadParams,
      disabled,
      canCancel,
      canRemove,
      canRestart,
      inputContent,
      inputWithFilesContent,
      submitButtonDisabled,
      submitButtonContent,
      classNames,
      styles,
      addClassNames,
      InputComponent,
      PreviewComponent,
      SubmitButtonComponent,
      LayoutComponent,
    } = this.props;

    const { active, dragged } = this.state;

    const reject = dragged.some(
      (file) =>
        file.type !== "application/x-moz-file" && !accepts(file as File, accept)
    );
    const extra = {
      active,
      reject,
      dragged,
      accept,
      multiple,
      minSizeBytes,
      maxSizeBytes,
      maxFiles,
    } as IExtra;
    const files = [...this.files];
    const dropzoneDisabled = resolveValue(disabled, files, extra);

    const {
      classNames: {
        dropzone: dropzoneClassName,
        dropzoneActive: dropzoneActiveClassName,
        dropzoneReject: dropzoneRejectClassName,
        dropzoneDisabled: dropzoneDisabledClassName,
        input: inputClassName,
        inputLabel: inputLabelClassName,
        inputLabelWithFiles: inputLabelWithFilesClassName,
        preview: previewClassName,
        previewImage: previewImageClassName,
        submitButtonContainer: submitButtonContainerClassName,
        submitButton: submitButtonClassName,
      },
      styles: {
        dropzone: dropzoneStyle,
        dropzoneActive: dropzoneActiveStyle,
        dropzoneReject: dropzoneRejectStyle,
        dropzoneDisabled: dropzoneDisabledStyle,
        input: inputStyle,
        inputLabel: inputLabelStyle,
        inputLabelWithFiles: inputLabelWithFilesStyle,
        preview: previewStyle,
        previewImage: previewImageStyle,
        submitButtonContainer: submitButtonContainerStyle,
        submitButton: submitButtonStyle,
      },
    } = mergeStyles(classNames, styles, addClassNames, files, extra);

    const InputActual = InputComponent || Input;
    const PreviewActual = PreviewComponent || Preview;
    const SubmitButtonActual = SubmitButtonComponent || SubmitButton;
    const LayoutActual = LayoutComponent || Layout;

    let previews = null;
    if (PreviewComponent !== null) {
      previews = files.map((f) => {
        return (
          //@ts-ignore
          <PreviewActual
            className={previewClassName}
            imageClassName={previewImageClassName}
            style={previewStyle as React.CSSProperties}
            imageStyle={previewImageStyle as React.CSSProperties}
            key={f.meta.id}
            fileWithMeta={f}
            meta={{ ...f.meta }}
            isUpload={Boolean(getUploadParams)}
            canCancel={resolveValue(canCancel, files, extra)}
            canRemove={resolveValue(canRemove, files, extra)}
            canRestart={resolveValue(canRestart, files, extra)}
            files={files}
            extra={extra}
          />
        );
      });
    }

    const input =
      InputComponent !== null ? (
        //@ts-ignore
        <InputActual
          className={inputClassName}
          labelClassName={inputLabelClassName}
          labelWithFilesClassName={inputLabelWithFilesClassName}
          style={inputStyle as React.CSSProperties}
          labelStyle={inputLabelStyle as React.CSSProperties}
          labelWithFilesStyle={inputLabelWithFilesStyle as React.CSSProperties}
          getFilesFromEvent={
            this.getFilesFromEvent() as IInputProps["getFilesFromEvent"]
          }
          accept={accept}
          multiple={multiple}
          disabled={dropzoneDisabled}
          content={resolveValue(inputContent, files, extra)}
          withFilesContent={resolveValue(inputWithFilesContent, files, extra)}
          onFiles={this.handleFiles} // see: https://stackoverflow.com/questions/39484895
          files={files}
          extra={extra}
        />
      ) : null;

    const submitButton =
      onSubmit && SubmitButtonComponent !== null ? (
        //@ts-ignore
        <SubmitButtonActual
          className={submitButtonContainerClassName}
          buttonClassName={submitButtonClassName}
          style={submitButtonContainerStyle as React.CSSProperties}
          buttonStyle={submitButtonStyle as React.CSSProperties}
          disabled={resolveValue(submitButtonDisabled, files, extra)}
          content={resolveValue(submitButtonContent, files, extra)}
          onSubmit={this.handleSubmit}
          files={files}
          extra={extra}
        />
      ) : null;

    let className = dropzoneClassName;
    let style = dropzoneStyle;

    if (dropzoneDisabled) {
      className = `${className} ${dropzoneDisabledClassName}`;
      style = { ...(style || {}), ...(dropzoneDisabledStyle || {}) };
    } else if (reject) {
      className = `${className} ${dropzoneRejectClassName}`;
      style = { ...(style || {}), ...(dropzoneRejectStyle || {}) };
    } else if (active) {
      className = `${className} ${dropzoneActiveClassName}`;
      style = { ...(style || {}), ...(dropzoneActiveStyle || {}) };
    }

    return (
      //@ts-ignore
      <LayoutActual
        input={input}
        previews={previews}
        submitButton={submitButton}
        dropzoneProps={{
          ref: this.dropzone,
          className,
          style: style as React.CSSProperties,
          onDragEnter: this.handleDragEnter,
          onDragOver: this.handleDragOver,
          onDragLeave: this.handleDragLeave,
          onDrop: dropzoneDisabled ? this.handleDropDisabled : this.handleDrop,
        }}
        files={files}
        extra={
          {
            ...extra,
            onFiles: this.handleFiles,
            onCancelFile: this.handleCancel,
            onRemoveFile: this.handleRemove,
            onRestartFile: this.handleRestart,
          } as IExtraLayout
        }
      />
    );
  }
}
Dropzone.defaultProps = {
  accept: "*",
  multiple: true,
  minSizeBytes: 0,
  maxSizeBytes: Number.MAX_SAFE_INTEGER,
  maxFiles: Number.MAX_SAFE_INTEGER,
  autoUpload: true,
  disabled: false,
  canCancel: true,
  canRemove: true,
  canRestart: true,
  inputContent: "Drag Files or Click to Browse",
  inputWithFilesContent: "Add Files",
  submitButtonDisabled: false,
  submitButtonContent: "Submit",
  classNames: {},
  styles: {},
  addClassNames: {},
};

export {
  formatBytes,
  formatDuration,
  accepts,
  defaultClassNames,
  defaultGetFilesFromEvent as getFilesFromEvent,
};
