/** Round profile photo, or coloured initials when there is no photo. */
export function Avatar({
  name,
  photoUrl,
  size = 32,
  alt = "",
}: {
  name: string;
  photoUrl: string | null;
  size?: number;
  alt?: string;
}) {
  const style = { width: size, height: size };

  if (photoUrl) {
    return (
      // A plain <img> is enough for small avatars and avoids image-optimisation quota.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={alt}
        width={size}
        height={size}
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) % 360;

  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{ ...style, backgroundColor: `hsl(${hash} 40% 42%)`, fontSize: size * 0.4 }}
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white"
    >
      {[...name].slice(0, 2).join("").toUpperCase()}
    </span>
  );
}
