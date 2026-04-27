"use client";

import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-red-800">오류가 발생했습니다</p>
          <p className="text-xs text-red-600">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="text-xs text-red-700 underline"
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
