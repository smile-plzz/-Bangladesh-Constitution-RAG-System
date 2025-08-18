export const metadata = {
	title: 'Bangladesh Constitution Q&A',
	description: 'Strict RAG over the Constitution of Bangladesh',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body style={{ background: '#ffffff', color: '#0f172a' }}>{children}</body>
		</html>
	);
}
