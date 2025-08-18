import fs from 'fs';
import axios from 'axios';

const API_BASE = 'https://bd-laws-api.bdit.community/api';

function getActIdFromArg(arg) {
	if (!arg) return null;
	// Accept either a numeric id like "383" or a full URL like "https://.../sections/383"
	const match = String(arg).match(/(\d+)$/);
	return match ? match[1] : null;
}

function normalizeWhitespace(text) {
	return String(text || '')
		.replace(/\r\n|\r|\n/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

async function fetchSections(actId) {
	const url = `${API_BASE}/sections/${actId}`;
	const { data } = await axios.get(url, { timeout: 60000 });
	if (!Array.isArray(data)) {
		throw new Error(`Unexpected response for sections: ${url}`);
	}
	return data;
}

async function main() {
	const arg = process.argv[2];
	const actId = getActIdFromArg(arg);
	if (!actId) {
		console.error('Usage: node src/fetch-sections.js <act_id or full sections URL>');
		process.exit(1);
	}

	console.log(`Fetching sections for act_id=${actId} ...`);
	const sections = await fetchSections(actId);
	console.log(`Fetched ${sections.length} sections.`);

	const outPath = `bdlaws_sections_${actId}.jsonl`;
	const out = fs.createWriteStream(outPath, { encoding: 'utf-8' });
	for (const s of sections) {
		const sectionId = s.id;
		const name = normalizeWhitespace(s.name);
		const description = normalizeWhitespace(s.description);
		const rec = {
			url: `${API_BASE}/sections/${actId}#section-${sectionId}`,
			title: `Act ${actId} - ${name}`,
			headings: [name],
			text: description,
		};
		out.write(JSON.stringify(rec) + '\n');
	}
	out.end();
	await new Promise(res => out.on('finish', res));
	console.log(`Wrote ${sections.length} JSONL lines to ${outPath}`);
	console.log('Next: node src/setup-db.js', outPath);
}

main().catch(err => {
	console.error('Error:', err?.message || err);
	process.exit(1);
}); 