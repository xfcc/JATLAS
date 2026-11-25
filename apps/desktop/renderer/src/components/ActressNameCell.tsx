type ActressNameCellProps = {
  name: string;
  avatarSrc?: string;
  retired: boolean;
  missingEmbyId: boolean;
};

export function ActressNameCell({ name, avatarSrc, retired, missingEmbyId }: ActressNameCellProps) {
  return (
    <span className={`actress-name-cell${retired ? ' is-retired' : ''}`}>
      {avatarSrc ? <img className="actress-avatar-thumb" src={avatarSrc} alt="" /> : null}
      <span className="actress-name-text">{name}</span>
      {retired ? (
        <span className="actress-retired-marker" title="已引退" aria-label="已引退">
          [引退]
        </span>
      ) : null}
      {missingEmbyId ? (
        <span className="missing-emby-marker" title="未绑定 Emby ID" aria-label="未绑定 Emby ID">
          [!]
        </span>
      ) : null}
    </span>
  );
}
