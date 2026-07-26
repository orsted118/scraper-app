import FileSheet, { KNOCKOUT } from './FileSheet';

function VideoIcon(props) {
  return (
    <FileSheet color="var(--file-video)" {...props}>
      <path
        d="M7.6 11.4h8.8v7.4H7.6z"
        stroke={KNOCKOUT}
        strokeWidth="1.3"
        fill="none"
      />
      <path
        d="M9.6 11.4v7.4M14.4 11.4v7.4M9.6 15.1h4.8"
        stroke={KNOCKOUT}
        strokeWidth="1.3"
        fill="none"
      />
    </FileSheet>
  );
}

export default VideoIcon;
