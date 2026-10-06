// ReactBits "Gradient Text" — animated gradient fill on text.
export default function GradientText({
  children,
  className = '',
  colors = ['#7c7bff', '#40ffaa', '#4079ff', '#b14bff', '#7c7bff'],
  animationSpeed = 8,
}) {
  const style = {
    backgroundImage: `linear-gradient(to right, ${colors.join(', ')})`,
    animationDuration: `${animationSpeed}s`,
  }
  return (
    <span className={`gradient-text ${className}`} style={style}>
      {children}
    </span>
  )
}
