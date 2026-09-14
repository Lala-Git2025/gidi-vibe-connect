import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportRenderError } from '../lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /** Sentry event id when reporting is configured — shown so the user can quote it. */
  eventId: string | null;
}

// Hardcoded dark theme colors — ErrorBoundary renders outside ThemeProvider,
// so useTheme() cannot be used here.
const fallbackColors = {
  background: '#000000',
  cardBackground: '#18181b',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  error: '#EF4444',
  primary: '#EAB308',
};

function ErrorFallback({
  error,
  errorInfo,
  eventId,
  onReset,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
  onReset: () => void;
}) {
  const colors = fallbackColors;

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
    reference: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      marginBottom: 24,
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
        <Ionicons name="warning" size={64} color="#f59e0b" style={{ marginBottom: 16 }} />
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

        {eventId && (
          <Text style={dynamicStyles.reference}>Reference: {eventId}</Text>
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
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Ships to Sentry when a DSN is configured; otherwise returns undefined
    // and the fallback simply omits the reference line.
    const eventId = reportRenderError(error, errorInfo.componentStack) ?? null;

    this.setState({ error, errorInfo, eventId });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
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
          eventId={this.state.eventId}
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
