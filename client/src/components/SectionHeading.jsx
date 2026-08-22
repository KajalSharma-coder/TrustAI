import Badge from "./Badge.jsx";

function SectionHeading({ badge, title, subtitle, align = "left" }) {
  const alignment = align === "center" ? "mx-auto text-center" : "";

  return (
    <div className={`max-w-3xl ${alignment}`.trim()}>
      {badge && <Badge>{badge}</Badge>}
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default SectionHeading;
