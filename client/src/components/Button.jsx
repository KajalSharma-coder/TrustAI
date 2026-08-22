import { Link } from "react-router-dom";

function Button({
  children,
  to,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  const baseClass = variant === "secondary" ? "secondary-button" : "primary-button";
  const classes = `${baseClass} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

export default Button;
