import { ExternalLink } from './components/ExternalLink';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from './constants/theme';
import { useAuth } from './hooks/use-auth';

export default function LoginScreen() {
	const { isAuthenticated } = useAuth();

	// Redirect to main app if already authenticated
	useEffect(() => {
		if (isAuthenticated) {
			router.replace('/(tabs)');
		}
	}, [isAuthenticated]);

	const handleAppleSignIn = async () => {
		Alert.alert(
			'Coming Soon',
			'Apple Sign In is not ready yet. Please use guest access for now.',
			[{ text: 'OK' }]
		);
	};

	const handleGoogleSignIn = async () => {
		Alert.alert(
			'Coming Soon',
			'Google Sign In is not ready yet. Please use guest access for now.',
			[{ text: 'OK' }]
		);
	};

	const handleEmailSignIn = () => {
		Alert.alert(
			'Coming Soon',
			'Email Sign In is not ready yet. Please use guest access for now.',
			[{ text: 'OK' }]
		);
	};

	const handleGuestSignIn = async () => {
		Alert.alert(
			'Coming Soon',
			'Guest Sign In is not ready yet. Please use guest access for now.',
			[{ text: 'OK' }]
		);
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.subtitle}>
					Discover, bid, and win amazing auctions
				</Text>
				<Text style={styles.description}>
					Join thousands of bidders in live auctions and find unique items at
					great prices
				</Text>
			</View>
			<View style={styles.buttonContainer}>
				{/* Social Login Row */}
				<View style={styles.socialButtonRow}>
					<TouchableOpacity
						style={[styles.socialButton, styles.appleButton]}
						onPress={handleAppleSignIn}
					>
						<AntDesign
							name="apple1"
							size={24}
							color={theme.colors.background}
						/>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.socialButton, styles.googleButton]}
						onPress={handleGoogleSignIn}
					>
						<AntDesign
							name="google"
							size={24}
							color={theme.colors.background}
						/>
					</TouchableOpacity>
				</View>

				{/* Separator */}
				<View style={styles.separatorContainer}>
					<View style={styles.separatorLine} />
					<Text style={styles.separatorText}>or</Text>
					<View style={styles.separatorLine} />
				</View>

				{/* Email/Password Options */}
				<TouchableOpacity
					style={[styles.button, styles.emailButton]}
					onPress={handleEmailSignIn}
				>
					<AntDesign name="mail" size={24} color={theme.colors.textPrimary} />
					<Text style={[styles.buttonText, styles.emailButtonText]}>
						Continue with Email
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.button, styles.guestButton]}
					onPress={handleGuestSignIn}
				>
					<AntDesign name="user" size={24} color={theme.colors.textPrimary} />
					<Text style={[styles.buttonText, styles.guestButtonText]}>
						Continue as Guest
					</Text>
				</TouchableOpacity>
			</View>

			<Text style={styles.privacyText}>
				By signing up, you agree to our{' '}
				<ExternalLink href="/privacy-policy" style={styles.link}>
					privacy policy
				</ExternalLink>
				.
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
		padding: theme.spacing.lg,
		justifyContent: 'space-between',
		paddingTop: 100,
		paddingBottom: 50,
	},
	header: {
		marginBottom: theme.spacing.xl,
	},
	title: {
		fontSize: theme.typography.sizes.xxl,
		fontWeight: theme.typography.weights.normal,
		color: theme.colors.textPrimary,
		lineHeight: 44,
	},
	subtitle: {
		fontSize: theme.typography.sizes.xxxl,
		fontStyle: 'italic',
		letterSpacing: -1,
		fontWeight: theme.typography.weights.bold,
		color: theme.colors.textPrimary,
		marginTop: theme.spacing.sm,
	},
	description: {
		fontSize: theme.typography.sizes.md,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.sm,
		lineHeight: 24,
	},
	buttonContainer: {
		gap: theme.spacing.lg,
	},
	socialButtonRow: {
		flexDirection: 'row',
		gap: theme.spacing.md,
		justifyContent: 'center',
	},
	socialButton: {
		width: 60,
		height: 60,
		borderRadius: theme.borderRadius.full,
		alignItems: 'center',
		justifyContent: 'center',
	},
	socialButtonText: {
		fontSize: 20,
		fontWeight: theme.typography.weights.bold,
	},
	separatorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: theme.spacing.sm,
	},
	separatorLine: {
		flex: 1,
		height: 1,
		backgroundColor: theme.colors.border,
		opacity: 0.3,
	},
	separatorText: {
		color: theme.colors.textSecondary,
		fontSize: theme.typography.sizes.sm,
		marginHorizontal: theme.spacing.md,
		fontWeight: theme.typography.weights.medium,
	},
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: theme.spacing.md,
		borderRadius: theme.borderRadius.md,
		gap: theme.spacing.md,
	},
	buttonText: {
		fontSize: theme.typography.sizes.md,
		fontWeight: theme.typography.weights.semibold,
	},
	appleButton: {
		backgroundColor: theme.colors.textPrimary,
		...theme.shadows.sm,
	},
	appleButtonText: {
		color: theme.colors.background,
	},
	googleButton: {
		backgroundColor: theme.colors.textPrimary,
		borderWidth: 1,
		borderColor: theme.colors.border,
		...theme.shadows.sm,
	},
	emailButton: {
		backgroundColor: theme.colors.surface,
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	googleButtonText: {
		color: theme.colors.background,
	},
	emailButtonText: {
		color: theme.colors.textPrimary,
	},
	guestButton: {
		backgroundColor: theme.colors.surface,
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	guestButtonText: {
		color: theme.colors.textPrimary,
	},
	privacyText: {
		textAlign: 'center',
		color: theme.colors.textSecondary,
		fontSize: theme.typography.sizes.sm,
	},
	link: {
		color: theme.colors.primary,
		textDecorationLine: 'underline',
	},
});
