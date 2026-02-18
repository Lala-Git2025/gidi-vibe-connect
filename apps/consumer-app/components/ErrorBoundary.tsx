import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Functional component that uses the theme hook
function ErrorFallback({
  error,
  errorInfo,
  onReset,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 24,
    },
    errorDetails: {
      maxHeight: 200,
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      padding: 12,
      marginBottom: 24,
    },
    errorTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.error,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      lineHeight: 18,
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 12,
      minWidth: 200,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={dynamicStyles.title}>Oops! Something went wrong</Text>
        <Text style={dynamicStyles.message}>
          We're sorry for the inconvenience. The app encountered an unexpected error.
        </Text>

        {__DEV__ && error && (
          <ScrollView style={dynamicStyles.errorDetails}>
            <Text style={dynamicStyles.errorTitle}>Error Details (Dev Only):</Text>
            <Text style={dynamicStyles.errorText}>{error.toString()}</Text>
            {errorInfo && (
              <Text style={dynamicStyles.errorText}>
                {errorInfo.componentStack}
              </Text>
            )}
          </ScrollView>
        )}

        <TouchableOpacity style={dynamicStyles.button} onPress={onReset}>
          <Text style={dynamicStyles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send error to crash reporting service (Sentry, Bugsnag, etc.)
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with theme colors
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
});
