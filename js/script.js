/**
 * POKESCRIBE v1.7 - Legendary Forms Update
 * Soporte masivo para formas: Rotom, Deoxys, Genios, Fusiones y más.
 */

function convertTeam() {
    const rawInput = document.getElementById('input').value.trim();
    const outputDiv = document.getElementById('output');
    
    if (!rawInput) {
        outputDiv.innerHTML = '<div class="poke-card" style="border-left-color:var(--danger); text-align:center;"><p style="color:var(--text); font-weight:bold;">El campo está vacío. Pega un set de Showdown.</p></div>';
        return;
    }

    const blocks = rawInput.split(/\n\s*\n/);
    outputDiv.innerHTML = ''; 

    let foundAny = false;
    blocks.forEach((block, index) => {
        const pokeData = parsePokemon(block);
        if (pokeData.species) {
            renderPokemon(pokeData, index + 1, outputDiv);
            foundAny = true;
        }
    });

    if (!foundAny) {
        outputDiv.innerHTML = '<div class="poke-card" style="border-left-color:var(--danger); text-align:center;"><p style="color:var(--text); font-weight:bold;">No se detectó ningún Pokémon válido. Revisa el formato.</p></div>';
    }
}

function clearAll() {
    document.getElementById('input').value = '';
    document.getElementById('output').innerHTML = '';
}

function parsePokemon(block) {
    const lines = block.split('\n');
    let data = {
        species: '', item: '', ability: '', tera: '', nature: '',
        evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, 
        ivs: {hp:31, atk:31, def:31, spa:31, spd:31, spe:31}, 
        moves: [], gender: '', formParam: '', isShiny: false
    };

    const cleanID = (str) => str.toLowerCase().trim().replace(/ /g, '').replace(/[^a-z0-9]/g, '');

    lines.forEach((line, i) => {
        line = line.trim();
        if (!line) return;

        if (i === 0) {
            const parts = line.split(' @ ');
            data.item = parts[1] ? parts[1].trim() : '';
            let namePart = parts[0];

            if (namePart.includes('(M)')) { data.gender = 'male'; namePart = namePart.replace('(M)', ''); }
            else if (namePart.includes('(F)')) { data.gender = 'female'; namePart = namePart.replace('(F)', ''); }
            
            const match = namePart.match(/\(([^)]+)\)/);
            data.species = match ? match[1].trim() : namePart.trim();

            let lowSpec = data.species.toLowerCase();

            // --- LÓGICA DE FORMAS ESPECIALES COBBLEMON ---

            // 1. Rotom (Appliance)
            if (lowSpec.startsWith('rotom-')) {
                const appliances = ['fan', 'frost', 'heat', 'mow', 'wash'];
                appliances.forEach(a => { if (lowSpec.includes(a)) data.formParam += ` appliance=${a}`; });
                data.species = 'rotom';
            }
            // 2. Deoxys (Meteorite Forme)
            else if (lowSpec.startsWith('deoxys-')) {
                const dForms = { 'attack': 'attack', 'defense': 'defense', 'speed': 'speed' };
                for (let f in dForms) { if (lowSpec.includes(f)) data.formParam += ` meteorite_forme=${dForms[f]}`; }
                data.species = 'deoxys';
            }
            // 3. Shaymin (Gracidea Forme)
            else if (lowSpec === 'shaymin-sky') {
                data.formParam += ' gracidea_forme=sky';
                data.species = 'shaymin';
            } else if (lowSpec === 'shaymin') {
                data.formParam += ' gracidea_forme=land';
            }
            // 4. Genios: Landorus, Tornadus, Thundurus, Enamorus (Mirror Forme)
            const genies = ['landorus', 'tornadus', 'thundurus', 'enamorus'];
            if (genies.some(g => lowSpec.startsWith(g))) {
                data.formParam += lowSpec.includes('-therian') ? ' mirror_forme=therian' : ' mirror_forme=incarnate';
                data.species = lowSpec.split('-')[0];
            }
            // 5. Kyurem (Absofusion)
            else if (lowSpec.includes('kyurem-')) {
                if (lowSpec.includes('black')) data.formParam += ' absofusion=black';
                if (lowSpec.includes('white')) data.formParam += ' absofusion=white';
                data.species = 'kyurem';
            }
            // 6. Necrozma (Prism Fusion)
            else if (lowSpec.includes('necrozma-')) {
                if (lowSpec.includes('dawn')) data.formParam += ' prism_fusion=dawn';
                if (lowSpec.includes('dusk')) data.formParam += ' prism_fusion=dusk';
                data.species = 'necrozma';
            }
            // 7. Hoopa (Djinn State)
            else if (lowSpec.includes('hoopa')) {
                data.formParam += lowSpec.includes('unbound') ? ' djinn_state=unbound' : ' djinn_state=confined';
                data.species = 'hoopa';
            }
            // 8. Oricorio (Dance Style)
            else if (lowSpec.includes('oricorio')) {
                if (lowSpec.includes('pau')) data.formParam += ' dance_style=pau';
                else if (lowSpec.includes('pom-pom')) data.formParam += ' dance_style=pom-pom';
                else if (lowSpec.includes('sensu')) data.formParam += ' dance_style=sensu';
                else data.formParam += ' dance_style=baile';
                data.species = 'oricorio';
            }
            // 9. Calyrex (King Steed)
            else if (lowSpec.includes('calyrex-')) {
                if (lowSpec.includes('ice')) data.formParam += ' king_steed=ice';
                if (lowSpec.includes('shadow')) data.formParam += ' king_steed=shadow';
                data.species = 'calyrex';
            }
            // 10. Urshifu (Wushu Style)
            else if (lowSpec.includes('urshifu')) {
                data.formParam += lowSpec.includes('rapid-strike') ? ' wushu_style=rapid_strike' : ' wushu_style=single_strike';
                data.species = 'urshifu';
            }

            // Corrección de especies con género (-F/-M)
            const genderedSuffixMons = ['indeedee', 'basculegion', 'oinkologne', 'meowstic'];
            if (genderedSuffixMons.some(s => lowSpec.startsWith(s))) {
                data.species = data.species.split('-')[0];
            }

            // Gastrodon y Tauros Paldea
            if (data.species.toLowerCase().includes('gastrodon')) {
                data.formParam += data.species.toLowerCase().includes('east') ? ' sea=east' : ' sea=west';
                data.species = 'gastrodon';
            }
            if (data.species.toLowerCase().includes('tauros-paldea')) {
                if (data.species.toLowerCase().includes('aqua')) data.formParam += ' bull_breed=aqua';
                else if (data.species.toLowerCase().includes('blaze')) data.formParam += ' bull_breed=blaze';
                data.formParam += ' paldean=true';
                data.species = 'tauros';
            }

            // Regiones (Kazeran incluido)
            const regions = { 'Alola': 'alolan', 'Galar': 'galarian', 'Paldea': 'paldean', 'Hisui': 'hisuian', 'Kazeran': 'kazeran' };
            for (let r in regions) {
                if (data.species.includes('-' + r)) {
                    if (!data.formParam.includes(regions[r])) data.formParam += ` ${regions[r]}=true`;
                    data.species = data.species.replace('-' + r, '');
                }
            }
        }
        else if (line.startsWith('Shiny:')) data.isShiny = line.toLowerCase().includes('yes');
        else if (line.startsWith('Ability:')) data.ability = line.split(': ')[1];
        else if (line.startsWith('Tera Type:')) data.tera = line.split(': ')[1];
        else if (line.startsWith('EVs:')) {
            line.split(': ')[1].split(' / ').forEach(p => {
                const s = p.trim().split(' ');
                data.evs[s[1].toLowerCase()] = parseInt(s[0]);
            });
        }
        else if (line.startsWith('IVs:')) {
            line.split(': ')[1].split(' / ').forEach(p => {
                const s = p.trim().split(' ');
                data.ivs[s[1].toLowerCase()] = s[0];
            });
        }
        else if (line.includes(' Nature')) data.nature = line.split(' ')[0];
        else {
            let moveCandidate = line;
            if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
                moveCandidate = line.substring(1).trim();
            }
            if (!moveCandidate.includes(':') && !moveCandidate.includes('@')) {
                data.moves.push(cleanID(moveCandidate));
            }
        }
    });
    return data;
}

function renderPokemon(data, slot, container) {
    const toJoin = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, ''); 
    const toSnake = (str) => str.toLowerCase().trim().replace(/[ -]/g, '_').replace(/[^a-z0-9_]/g, '');

    const itemName = data.item.toLowerCase();
    let prefix = 'cobblemon:';
    if (itemName !== 'eviolite' && itemName !== '') {
        const megaKeywords = ['ite', 'crystal', 'orb', 'meteorite'];
        if (megaKeywords.some(k => itemName.includes(k))) prefix = 'mega_showdown:';
    }
    
    const finalItem = data.item ? ` held_item=${prefix}${toSnake(data.item)}` : '';
    const finalAbility = toJoin(data.ability);
    const finalSpecies = toJoin(data.species);

    let ivString = '';
    const hasNonPerfect = Object.values(data.ivs).some(v => parseInt(v) !== 31);
    if (hasNonPerfect) {
        const ivMap = { hp: 'hp_iv', atk: 'attack_iv', def: 'defence_iv', spa: 'special_attack_iv', spd: 'special_defence_iv', spe: 'speed_iv' };
        for (let key in data.ivs) { ivString += ` ${ivMap[key]}=${data.ivs[key]}`; }
    } else { ivString = ' min_perfect_ivs=6'; }

    const evMap = { hp: 'hp_ev', atk: 'attack_ev', def: 'defence_ev', spa: 'special_attack_ev', spd: 'special_defence_ev', spe: 'speed_ev' };
    let evString = '';
    let totalEVs = 0;
    for (let key in data.evs) { if (data.evs[key] > 0) { evString += ` ${evMap[key]}=${data.evs[key]}`; totalEVs += data.evs[key]; } }

    const evClass = totalEVs > 510 ? 'ev-error' : 'ev-ok';
    const evText = totalEVs > 510 ? `⚠️ ERROR: ${totalEVs}/510 EVs` : `EVs: ${totalEVs}/510`;

    const giveCmd = `/pokegive ${finalSpecies} lvl=100${finalItem}${data.gender ? ' gender='+data.gender : ''} ability=${finalAbility}${data.tera ? ' tera_type='+toJoin(data.tera) : ''}${ivString}${evString} nature=${toJoin(data.nature)}${data.formParam}${data.isShiny ? ' shiny=true' : ''}`;
    const editCmd = `/pokeedit ${slot} moves=${data.moves.join(',')}`;

    const card = document.createElement('div');
    card.className = 'poke-card';
    card.innerHTML = `
        <h3 style="color:var(--primary); margin:0">#${slot} - ${data.species.toUpperCase()}${data.isShiny ? ' ✨' : ''}</h3>
        <span class="ev-counter ${evClass}">${evText}</span>
        
        <div class="command-wrap" style="margin-top:15px">
            <span class="label">Comando Give (Aparecer)</span>
            <span class="cmd-text" id="give-${slot}">${giveCmd}</span>
            <button class="copy-btn" onclick="copyText('give-${slot}', this)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
        </div>
        <div class="command-wrap">
            <span class="label">Comando Edit (Movimientos)</span>
            <span class="cmd-text" id="edit-${slot}">${editCmd}</span>
            <button class="copy-btn" onclick="copyText('edit-${slot}', this)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
        </div>
    `;
    container.appendChild(card);
}

function copyText(id, btn) {
    const text = document.getElementById(id).innerText;
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        const old = btn.innerHTML;
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = old; }, 1500);
    });
}
