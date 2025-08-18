import fs from 'fs';
import axios from 'axios';

const API_BASE = 'https://bd-laws-api.bdit.community/api';

function normalizeWhitespace(text) {
    return String(text || '')
        .replace(/\r\n|\r|\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchVolumes() {
    const { data } = await axios.get(`${API_BASE}/volumes`, { timeout: 60000 });
    if (!Array.isArray(data)) throw new Error('Unexpected /volumes response');
    return data;
}

async function fetchActs(volumeId) {
    const { data } = await axios.get(`${API_BASE}/acts/${volumeId}`, { timeout: 60000 });
    if (!Array.isArray(data)) throw new Error(`Unexpected /acts/${volumeId} response`);
    return data;
}

function looksLikeConstitution(name) {
    const n = String(name || '').toLowerCase();
    return n.includes('constitution');
}

async function fetchSections(actId) {
    const { data } = await axios.get(`${API_BASE}/sections/${actId}`, { timeout: 60000 });
    if (!Array.isArray(data)) throw new Error(`Unexpected /sections/${actId} response`);
    return data;
}

async function main() {
    console.log('Discovering Constitution act...');
    const volumes = await fetchVolumes();

    let constitutionAct = null;
    for (const vol of volumes) {
        const acts = await fetchActs(vol.id);
        for (const act of acts) {
            if (looksLikeConstitution(act.name)) {
                constitutionAct = act;
                break;
            }
        }
        if (constitutionAct) break;
    }

    if (!constitutionAct) {
        console.error('Could not find an act with name containing "Constitution". Please provide the act_id manually.');
        process.exit(1);
    }

    const actId = constitutionAct.id;
    const actName = constitutionAct.name;
    console.log(`Found Constitution act: id=${actId}, name="${actName}"`);

    const sections = await fetchSections(actId);
    console.log(`Fetched ${sections.length} sections.`);

    const outPath = `bdlaws_constitution_${actId}.jsonl`;
    const out = fs.createWriteStream(outPath, { encoding: 'utf-8' });

    for (const s of sections) {
        const sectionId = s.id;
        const name = normalizeWhitespace(s.name);
        const description = normalizeWhitespace(s.description);
        const rec = {
            url: `${API_BASE}/sections/${actId}#section-${sectionId}`,
            title: `${actName} - ${name}`,
            headings: [name],
            text: description,
            created_at: s.created_at || null,
            updated_at: s.updated_at || null,
            act_id: s.act_id || Number(actId),
            section_id: sectionId,
        };
        out.write(JSON.stringify(rec) + '\n');
    }

    out.end();
    await new Promise(res => out.on('finish', res));
    console.log(`Wrote ${sections.length} JSONL lines to ${outPath}`);
    console.log('Next steps:');
    console.log(`  node src/setup-db.js ${outPath}`);
    console.log('  node src/query.js "What is the supreme law of the Republic?"');
}

main().catch(err => {
    console.error('Error:', err?.message || err);
    process.exit(1);
}); 