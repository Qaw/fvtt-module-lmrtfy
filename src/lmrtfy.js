class LMRTFY {
    static async init() {
        game.settings.register('lmrtfy', 'enableParchmentTheme', {
            name: game.i18n.localize('LMRTFY.EnableParchmentTheme'),
            hint: game.i18n.localize('LMRTFY.EnableParchmentThemeHint'),
            scope: 'client',
            config: true,
            type: Boolean,
            default: true,
            onChange: (value) => LMRTFY.onThemeChange(value)
        });
        game.settings.register('lmrtfy', 'deselectOnRequestorRender', {
            name: game.i18n.localize('LMRTFY.DeselectOnRequestorRender'),
            hint: game.i18n.localize('LMRTFY.DeselectOnRequestorRenderHint'),
            scope: 'world',
            config: true,
            type: Boolean,
            default: false,
            onChange: () => window.location.reload()
        });

        Handlebars.registerHelper('lmrtfy-controlledToken', function (actor) {
            const activeToken = actor.getActiveTokens()[0];
            if (activeToken) {
                return activeToken._controlled;
            } else {
                return false;
            }
        });
    }

    static ready() {
        game.socket.on('module.lmrtfy', LMRTFY.onMessage);

        switch (game.system.id) {
            case 'dnd5eJP':
            case 'dnd5e':
            case 'sw5e':
                LMRTFY.saveRollMethod = 'rollAbilitySave';
                LMRTFY.abilityRollMethod = 'rollAbilityTest';
                LMRTFY.skillRollMethod = 'rollSkill';
                LMRTFY.abilities = CONFIG.DND5E.abilities;
                LMRTFY.skills = CONFIG.DND5E.skills;
                LMRTFY.saves = CONFIG.DND5E.abilities;
                LMRTFY.normalRollEvent = { shiftKey: true, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: true, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: true };
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': true };
                LMRTFY.abilityAbbreviations = CONFIG.DND5E.abilityAbbreviations;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                break;

            case 'pf1':
                LMRTFY.saveRollMethod = 'rollSavingThrow';
                LMRTFY.abilityRollMethod = 'rollAbility';
                LMRTFY.skillRollMethod = 'rollSkill';
                LMRTFY.abilities = CONFIG.PF1.abilities;
                LMRTFY.skills = CONFIG.PF1.skills;
                LMRTFY.saves = CONFIG.PF1.savingThrows;
                LMRTFY.normalRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: true, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: true };
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': false, 'perception': false };
                LMRTFY.abilityAbbreviations = CONFIG.PF1.abilityAbbreviations;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                break;

            case 'pf2e':
                LMRTFY.saveRollMethod = 'rollSave';
                LMRTFY.abilityRollMethod = 'rollAbility';
                LMRTFY.skillRollMethod = 'rollSkill';
                LMRTFY.abilities = CONFIG.PF2E.abilities;
                LMRTFY.skills = CONFIG.PF2E.skills;
                LMRTFY.saves = CONFIG.PF2E.saves;
                LMRTFY.normalRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: true, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: true };
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': true, 'perception': true };
                LMRTFY.abilityAbbreviations = CONFIG.PF2E.abilityAbbreviations;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                break;

            case 'D35E':
                LMRTFY.saveRollMethod = 'rollSave';
                LMRTFY.abilityRollMethod = 'rollAbility';
                LMRTFY.skillRollMethod = 'rollSkill';
                LMRTFY.abilities = CONFIG.D35E.abilities;
                LMRTFY.skills = CONFIG.D35E.skills;
                LMRTFY.saves = CONFIG.D35E.savingThrows;
                LMRTFY.normalRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: true, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: true };
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': false, 'perception': true };
                LMRTFY.abilityAbbreviations = CONFIG.D35E.abilityAbbreviations;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                break;

            case 'cof':
                LMRTFY.saveRollMethod = 'rollStat';
                LMRTFY.abilityRollMethod = 'rollStat';
                LMRTFY.skillRollMethod = 'rollStat';
                LMRTFY.abilities = CONFIG.COF.stats;
                LMRTFY.skills = CONFIG.COF.skills;
                LMRTFY.normalRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.specialRolls = {};
                LMRTFY.abilityAbbreviations = CONFIG.COF.statAbbreviations;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                break;

            default:
                console.error('LMRFTY | Unsupported system detected');

        }

        if (game.settings.get('lmrtfy', 'deselectOnRequestorRender')) {
            Hooks.on("renderLMRTFYRequestor", () => {
                canvas.tokens.releaseAll();
            })
        }
    }

    static parseAbilityModifiers() {
        let abilityMods = {};

        for (let key in LMRTFY.abilities) {
            if (LMRTFY.abilityAbbreviations.hasOwnProperty(key)) {
                abilityMods[`abilities.${LMRTFY.abilityAbbreviations[key]}.${LMRTFY.modIdentifier}`] = LMRTFY.abilities[key];
            }
        }

        if (
            game.system.id === 'dnd5eJP' ||
            game.system.id === 'dnd5e' ||
            game.system.id === 'sw5e'
        ) {
            abilityMods['attributes.prof'] = 'DND5E.Proficiency';
        }

        return abilityMods;
    }

    static onMessage(data) {
        //console.log("LMRTF got message: ", data)
        if (data.user === "character" &&
            (!game.user.character || !data.actors.includes(game.user.character.id)))
            return;
        else if (!["character", "tokens"].includes(data.user) && data.user !== game.user.id)
            return;
        let actors = [];
        if (data.user === "character")
            actors = [game.user.character];
        else if (data.user === "tokens")
            actors = canvas.tokens.controlled.map(t => t.actor).filter(a => data.actors.includes(a.id));
        else
            actors = data.actors.map(aid => LMRTFY.fromUuid(aid));
        actors = actors.filter(a => a);
        if (actors.length === 0) return;
        new LMRTFYRoller(actors, data).render(true);
    }
    static requestRoll() {
        if (LMRTFY.requestor === undefined)
            LMRTFY.requestor = new LMRTFYRequestor();
        LMRTFY.requestor.render(true);
    }

    static onThemeChange(enabled) {
        $(".lmrtfy.lmrtfy-requestor,.lmrtfy.lmrtfy-roller").toggleClass("lmrtfy-parchment", enabled)
        if (!LMRTFY.requestor) return;
        if (enabled)
            LMRTFY.requestor.options.classes.push("lmrtfy-parchment")
        else
            LMRTFY.requestor.options.classes = LMRTFY.requestor.options.classes.filter(c => c !== "lmrtfy-parchment")
        // Resize to fit the new theme
        if (LMRTFY.requestor.element.length)
            LMRTFY.requestor.setPosition({ width: "auto", height: "auto" })
    }

    static getSceneControlButtons(buttons) {
        let tokenButton = buttons.find(b => b.name == "token")

        if (tokenButton) {
            tokenButton.tools.push({
                name: "request-roll",
                title: game.i18n.localize('LMRTFY.ControlTitle'),
                icon: "fas fa-dice-d20",
                visible: game.user.isGM,
                onClick: () => LMRTFY.requestRoll(),
                button: true
            });
        }
    }

    static async hideBlind(app, html, msg) {
        if (msg.message.flags && msg.message.flags.lmrtfy) {
            if (msg.message.flags.lmrtfy.blind && !game.user.isGM) {
                msg.content = '<p>??</p>';

                let idx = html[0].innerHTML.indexOf('<div class="message-content">');
                html[0].innerHTML = html[0].innerHTML.substring(0, idx);
                html[0].innerHTML += `<div class="message-content">${msg.content}</div>`;
            }
        }
    }

    static fromUuid(uuid) {
        let parts = uuid.split(".");
        let doc;

        if (parts.length === 1) return game.actors.get(uuid);
        // Compendium Documents
        if (parts[0] === "Compendium") {
            return undefined;
        }

        // World Documents
        else {
            const [docName, docId] = parts.slice(0, 2);
            parts = parts.slice(2);
            const collection = CONFIG[docName].collection.instance;
            doc = collection.get(docId);
        }

        // Embedded Documents
        while (parts.length > 1) {
            const [embeddedName, embeddedId] = parts.slice(0, 2);
            doc = doc.getEmbeddedDocument(embeddedName, embeddedId);
            parts = parts.slice(2);
        }
        if (doc.actor) doc = doc.actor;
        return doc || undefined;
    }
}

Hooks.once('init', LMRTFY.init);
Hooks.on('ready', LMRTFY.ready);
Hooks.on('getSceneControlButtons', LMRTFY.getSceneControlButtons);
Hooks.on('renderChatMessage', LMRTFY.hideBlind);
