/**
 * POKESCRIBE v1.5 - Final Edition
 * Conversor de sets Showdown a comandos de Cobblemon.
 * Incluye soporte para formas regionales (Oficiales y Customs), validación de EVs y formateo de IDs.
 */

// --- LÓGICA DE INTERFAZ ---

/**
 * Procesa el texto del textarea y genera las tarjetas de comandos.
 */
function convertTeam() {
    const rawInput = document.getElementById('input').value.trim();
    const outputDiv = document.getElementById('output');
    
    // Validación de entrada vacía
    if (!rawInput) {
        outputDiv.innerHTML = '<div class="poke-card" style="border-left-color:var(--danger); text-align:center;"><p style="color:var(--text); font-weight:bold;">El campo está vacío. Pega un set de Showdown.</p></div>';
        return;
    }

    // Dividimos por bloques de Pokémon (líneas en blanco)
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

    // Mensaje de error si el texto no contiene un formato válido
    if (!foundAny) {
        outputDiv.innerHTML = '<div class="poke-card" style="border-left-color:var(--danger); text-align:center;"><p style="color:var(--text); font-weight:bold;">No se detectó ningún Pokémon válido. Revisa el formato.</p></div>';
    }
}

/**
 * Limpia el área de trabajo.
 */
function clearAll() {
    document.getElementById('input').value = '';
    document.getElementById('output').innerHTML = '';
}

// --- LÓGICA DE PROCESAMIENTO (PARSER) ---

/**
 * Analiza un bloque de texto de Showdown y devuelve un objeto con los datos del Pokémon.
 */
function parsePokemon(block) {
    const lines = block.split('\n');
    let data = {
        species: '', item: '', ability: '', tera: '', nature: '',
        evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, 
        ivs: {hp:31, atk:31, def:31, spa:31, spd:31, spe:31}, 
        moves: [], gender: '', formParam: '', isShiny: false
    };

    // Limpieza estándar para IDs de movimientos (todo junto, sin símbolos)
    const cleanID = (str) => str.toLowerCase().trim().replace(/ /g, '').replace(/[^a-z0-9]/g, '');

    lines.forEach((line, i) => {
        line = line.trim();
        if (!line) return;

        // Línea 1: Formato "Especie @ Objeto"
        if (i === 0) {
            const parts = line.split(' @ ');
            data.item = parts[1] ? parts[1].trim() : '';
            let namePart = parts[0];

            // Detección de género
            if (namePart.includes('(M)')) { data.gender = 'male'; namePart = namePart.replace('(M)', ''); }
            else if (namePart.includes('(F)')) { data.gender = 'female'; namePart = namePart.replace('(F)', ''); }
            
            // Detección de especie (maneja motes entre paréntesis)
            const match = namePart.match(/\(([^)]+)\)/);
            data.species = match ? match[1].trim() : namePart.trim();

            // Handlers para formas con parámetros específicos en Cobblemon
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

            // Mapeo de regiones (soporta Kazeran para la comunidad de Orizon)
            const regions = { 'Alola': 'alolan', 'Galar': 'galarian', 'Paldea': 'paldean', 'Hisui': 'hisuian', 'Kazeran': 'kazeran' };
            for (let r in regions) {
                if (data.species.includes('-' + r)) {
                    if (!data.formParam.includes(regions[r])) data.formParam += ` ${regions[r]}=true`;
                    data.species = data.species.replace('-' + r, '');
                }
            }
        }
        // Identificación de atributos por Keywords
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
        
        // Detección flexible de movimientos (acepta viñetas o texto directo)
        else {
            let moveCandidate = line;
            if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
                moveCandidate = line.substring(1).trim();
            }
            // Evita procesar líneas descriptivas como ataques
            if (!moveCandidate.includes(':') && !moveCandidate.includes('@')) {
                data.moves.push(cleanID(moveCandidate));
            }
        }
    });
    return data;
}

// --- LÓGICA DE RENDERIZADO Y COMANDOS ---

/**
 * Crea la tarjeta visual y formatea los comandos finales para Minecraft.
 */
function renderPokemon(data, slot, container) {
    // Formateadores de ID según requisitos de Cobblemon
    const toJoin = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, ''); // Para habilidades y movimientos
    const toSnake = (str) => str.toLowerCase().trim().replace(/[ -]/g, '_').replace(/[^a-z0-9_]/g, ''); // Para objetos

    // Gestión de prefijos de objetos (Compatibilidad con Mega Showdown)
    const itemName = data.item.toLowerCase();
    let prefix = 'cobblemon:';
    if (itemName !== 'eviolite' && itemName !== '') {
        const megaKeywords = ['ite', 'crystal', 'orb', 'meteorite'];
        if (megaKeywords.some(k => itemName.includes(k))) prefix = 'mega_showdown:';
    }
    
    const finalItem = data.item ? ` held_item=${prefix}${toSnake(data.item)}` : '';
    const finalAbility = toJoin(data.ability);
    const finalSpecies = toJoin(data.species);

    // Formateo de IVs (Optimizado: si son 31 no se listan individualmente)
    let ivString = '';
    const hasNonPerfect = Object.values(data.ivs).some(v => parseInt(v) !== 31);
    if (hasNonPerfect) {
        const ivMap = { hp: 'hp_iv', atk: 'attack_iv', def: 'defence_iv', spa: 'special_attack_iv', spd: 'special_defence_iv', spe: 'speed_iv' };
        for (let key in data.ivs) { ivString += ` ${ivMap[key]}=${data.ivs[key]}`; }
    } else { ivString = ' min_perfect_ivs=6'; }

    // Formateo de EVs y cálculo de suma total para validación
    const evMap = { hp: 'hp_ev', atk: 'attack_ev', def: 'defence_ev', spa: 'special_attack_ev', spd: 'special_defence_ev', spe: 'speed_ev' };
    let evString = '';
    let totalEVs = 0;
    for (let key in data.evs) { 
        if (data.evs[key] > 0) {
            evString += ` ${evMap[key]}=${data.evs[key]}`; 
            totalEVs += data.evs[key];
        }
    }

    // Estilo visual según validación de EVs (Límite competitivo 510)
    const evClass = totalEVs > 510 ? 'ev-error' : 'ev-ok';
    const evText = totalEVs > 510 ? `⚠️ ERROR: ${totalEVs}/510 EVs` : `EVs: ${totalEVs}/510`;

    // Construcción de comandos finales
    const giveCmd = `/pokegive ${finalSpecies} lvl=100${finalItem}${data.gender ? ' gender='+data.gender : ''} ability=${finalAbility}${data.tera ? ' tera_type='+toJoin(data.tera) : ''}${ivString}${evString} nature=${toJoin(data.nature)}${data.formParam}${data.isShiny ? ' shiny=true' : ''}`;
    const editCmd = `/pokeedit ${slot} moves=${data.moves.join(',')}`;

    // Inyección de HTML en la tarjeta
    const card = document.createElement('div');
    card.className = 'poke-card';
    card.innerHTML = `
        <h3 style="color:var(--primary); margin:0">#${slot} - ${data.species.toUpperCase()}${data.isShiny ? ' ✨' : ''}</h3>
        <span class="ev-counter ${evClass}">${evText}</span>
        
        <div class="command-wrap" style="margin-top:15px">
            <span class="label">Comando Give (Aparecer)</span>
            <span class="cmd-text" id="give-${slot}">${giveCmd}</span>
            <button class="copy-btn" onclick="copyText('give-${slot}', this)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
        </div>
        <div class="command-wrap">
            <span class="label">Comando Edit (Movimientos)</span>
            <span class="cmd-text" id="edit-${slot}">${editCmd}</span>
            <button class="copy-btn" onclick="copyText('edit-${slot}', this)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
        </div>
    `;
    container.appendChild(card);
}

/**
 * Maneja el copiado al portapapeles y el feedback visual del botón.
 */
function copyText(id, btn) {
    const text = document.getElementById(id).innerText;
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        const old = btn.innerHTML;
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = old; }, 1500);
    });
}
