import { Component } from "react";

/**
 * Без этого React в продакшен-сборке при ошибке рендера просто молча
 * размонтирует дерево — пользователь видит пустой (чёрный/белый, в
 * зависимости от темы) экран без единой подсказки, а в консоль браузера
 * на телефоне залезть нельзя. Этот компонент ловит такую ошибку и
 * показывает её текст прямо на экране, чтобы баг можно было
 * продиагностировать по скриншоту, а не вслепую.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Экран упал с ошибкой:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: "#fff", background: "#1a1a1a", minHeight: "100vh", fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap" }}>
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>⚠️ Ошибка на экране</p>
          <p>{String(this.state.error?.message ?? this.state.error)}</p>
          {this.state.error?.stack && (
            <p style={{ marginTop: 12, opacity: 0.7, fontSize: 11 }}>{this.state.error.stack}</p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
