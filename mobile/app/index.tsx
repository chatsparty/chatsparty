import { Redirect } from 'expo-router';
import { useAuth } from './hooks/use-auth';

export default function Index() {
	const { isAuthenticated, isLoading } = useAuth();

	// Show nothing while loading auth state
	if (isLoading) {
		return null;
	}

	// Redirect based on authentication state
	if (isAuthenticated) {
		return <Redirect href="/(tabs)" />;
	} else {
		return <Redirect href="/login" />;
	}
}
