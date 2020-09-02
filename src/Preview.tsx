import * as React from "react";

import { formatBytes, formatDuration } from "./utils";
//@ts-ignore
import cancelImg from "./assets/cancel.svg";
//@ts-ignore
import removeImg from "./assets/remove.svg";
//@ts-ignore
import restartImg from "./assets/restart.svg";

import { ICommonProps, IMeta, IFileWithMeta } from "./types";
export interface IPreviewProps extends ICommonProps {
  meta: IMeta;
  className?: string;
  imageClassName?: string;
  style?: React.CSSProperties;
  imageStyle?: React.CSSProperties;
  fileWithMeta: IFileWithMeta;
  isUpload: boolean;
  canCancel: boolean;
  canRemove: boolean;
  canRestart: boolean;
}

const iconByFn = {
  cancel: { backgroundImage: `url(${cancelImg})` },
  remove: { backgroundImage: `url(${removeImg})` },
  restart: { backgroundImage: `url(${restartImg})` },
};

export class Preview extends React.PureComponent<IPreviewProps> {
  render() {
    const {
      className,
      imageClassName,
      style,
      imageStyle,
      fileWithMeta: { cancel, remove, restart },
      meta: {
        name = "",
        percent = 0,
        size = 0,
        previewUrl,
        status,
        duration,
        validationError,
      },
      isUpload,
      canCancel,
      canRemove,
      canRestart,
      extra: { minSizeBytes },
    } = this.props;

    let title = `${name || "?"}, ${formatBytes(size)}`;
    if (duration) title = `${title}, ${formatDuration(duration)}`;

    if (status === "error_file_size" || status === "error_validation") {
      return (
        <div className={className} style={style}>
          <span className="dzu-previewFileNameError">{title}</span>
          {status === "error_file_size" && (
            <span>
              {size < minSizeBytes ? "File too small" : "File too big"}
            </span>
          )}
          {status === "error_validation" && (
            <span>{String(validationError)}</span>
          )}
          {canRemove && (
            <span
              className="dzu-previewButton"
              style={iconByFn.remove}
              onClick={remove}
            />
          )}
        </div>
      );
    }

    if (
      status === "error_upload_params" ||
      status === "exception_upload" ||
      status === "error_upload"
    ) {
      title = `${title} (upload failed)`;
    }
    if (status === "aborted") title = `${title} (cancelled)`;

    return (
      <div className={className} style={style}>
        {previewUrl && (
          <img
            className={imageClassName}
            style={imageStyle}
            src={previewUrl}
            alt={title}
            title={title}
          />
        )}
        {!previewUrl && <span className="dzu-previewFileName">{title}</span>}

        <div className="dzu-previewStatusContainer">
          {isUpload && (
            <progress
              max={100}
              value={
                status === "done" || status === "headers_received"
                  ? 100
                  : percent
              }
            />
          )}

          {status === "uploading" && canCancel && (
            <span
              className="dzu-previewButton"
              style={iconByFn.cancel}
              onClick={cancel}
            />
          )}
          {status !== "preparing" &&
            status !== "getting_upload_params" &&
            status !== "uploading" &&
            canRemove && (
              <span
                className="dzu-previewButton"
                style={iconByFn.remove}
                onClick={remove}
              />
            )}
          {[
            "error_upload_params",
            "exception_upload",
            "error_upload",
            "aborted",
            "ready",
          ].includes(status) &&
            canRestart && (
              <span
                className="dzu-previewButton"
                style={iconByFn.restart}
                onClick={restart}
              />
            )}
        </div>
      </div>
    );
  }
}
