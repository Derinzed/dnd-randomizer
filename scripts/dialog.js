class SFDialog extends FormApplication {
	constructor() {
		super();
		this.environments = SFCONSTS.GEN_OPT.environment
	}

	static get defaultOptions() {
		return { 
			...super.defaultOptions,
			title: game.i18n.localize('SF.dialog.title'),
			id: "SFDialog",
			template: `modules/dnd-randomizer/templates/dialog.hbs`,
			resizable: true,
			width: window.innerWidth > 700 ? 700 : window.innerWidth - 100,
			height: window.innerHeight > 800 ? 800 : window.innerHeight - 100
		}
	}

	getData() {
		return {
			environments: this.environments,
		}
	}

	getDefaultsFromScene(){
		const characters = canvas.tokens.placeables.filter(t => t.actor?.data.type === "character" && t.actor?.hasPlayerOwner)
		let level = 0
		characters.forEach((c) => level+=c.actor.data.data.details.level)
		level = Math.round(level / characters.length)
		return {chars: characters.length, level: level}
	}

	populateEncounters(encounterData) {
		const html = this.element
		let $ul = html.find('.form-encounters ul').first();

		for (const encounter of encounterData) {
			$ul.append(`<li class="is-favorited-${encounter.data?.id ?? false ? 'true' : 'false' }">
				<div class="favorite-encounter ${encounter.data?.id ?? false ? 'favorited': ''}"><i class="far fa-star"></i></div>
				<div class="encounter-details">
					<div class="encounter-details-header">
						<input type="text" class="encounter-details-header-title" value="${encounter.encounterName ?? "Custom Name"}" />
					</div>
					<div class="encounter-details-loot"></div>
				</div>
				<div class="encounter-info">
					<div class="encounter-data">
						<span class="loot-button"><i class="fas fa-coins"></i></span>
						${encounter.currency.pp > 0 ? `<span class="loot-button">pp ${encounter.currency.pp}</span>` : ''}
						${encounter.currency.gp > 0 ? `<span class="loot-button">gp ${encounter.currency.gp}</span>` : ''}
						${encounter.currency.ep > 0 ? `<span class="loot-button">ep ${encounter.currency.ep}</span>` : ''}
						${encounter.currency.sp > 0 ? `<span class="loot-button">sp ${encounter.currency.sp}</span>` : ''}
						${encounter.currency.cp > 0 ? `<span class="loot-button">cp ${encounter.currency.cp}</span>` : ''}
						<span class="encounter-difficulty ${encounter.data.difficulty}">${encounter.data.difficulty}</span>
						<span class="encounter-xp">${encounter.data.xp}</span>
					</div>
				</div>
				<div class="create-encounter">
					<i class="fas fa-angle-double-right" data-trigger="spawn"></i>
					<i class="fas fa-briefcase" data-trigger="loot"></i>
				</div>
			</li>`);

			$ul.find('li:last-child .encounter-details-header-title').on('change', function(event) {
				let $input = $(event.currentTarget);
				let savedEncounters = game.settings.get(SFCONSTS.MODULE_NAME, 'favoritedEncounters');
				let encounterDetails = {}; 

				// If named is cleared set it back to default encounter name
				$input.val($input.val().length > 0 ? $input.val() : encounter.name);

				// Update Encounter Name
				encounter.name = $input.val()
				
				// Build Encounter object to save Encounter data
				encounterDetails[encounter.id] = {
					...encounter.data,
					name: $input.val()
				}

				// If encounter is favorited, update it
				if ($input.closest('li').find('.favorite-encounter').hasClass('favorited')) {
					savedEncounters = foundry.utils.mergeObject(savedEncounters, encounterDetails, { inplace:  false});
				
					game.settings.set(SFCONSTS.MODULE_NAME, 'favoritedEncounters', savedEncounters);
				}
			})

			$ul.find('li:last-child .favorite-encounter i').on('click', function(event) {
				let $element = $(event.currentTarget).closest('div');
				let savedEncounters = game.settings.get(SFCONSTS.MODULE_NAME, 'favoritedEncounters');
				let encounterDetails = {}; 
				
				encounterDetails[encounter.id] = {
					...encounter.data,
					id: encounter.id,
					name: encounter.encounterName
				}

				$element.toggleClass('favorited');


				if ($element.hasClass('favorited')) {
					savedEncounters = foundry.utils.mergeObject(savedEncounters, encounterDetails, { inplace:  false});
				}else{
					delete savedEncounters[encounter.id]
				}

				game.settings.set(SFCONSTS.MODULE_NAME, 'favoritedEncounters', savedEncounters);
			});

			$ul.find('li:last-child .create-encounter i.fas[data-trigger="spawn"]').on('click', function(event) {
				canvas.templates.activate()
				ui.notifications.info("Please place a Circle Template to Spawn the Encounter")
				encounter.spawn();
			})

			$ul.find('li:last-child .create-encounter i.fas[data-trigger="loot"]').on('click', function(event) {
				encounter.createLootSheet();
			})

			let $details = $ul.find('li:last-child .encounter-details');
			for (const creature of encounter.creatures) {
				$details.find('.encounter-details-header').append(`<span class="creature-button"><span class="creature-count">${creature.quantity}</span> ${TextEditor.enrichHTML(creature.dynamicLink)}</span>`);
			}

			
			for (const loot of encounter.loot) {
				$details.find('.encounter-details-loot').append(`<span class="loot-button">
					${loot.quantity} <i class="fas fa-times" style="font-size: 0.5rem"></i>
					${loot.dynamicLink.length > 0 ? TextEditor.enrichHTML(loot.dynamicLink) : loot.name}
				</span>`)
			}
		}
	}

	async activateListeners(html) {
		super.activateListeners(html);
		const _this=this;
		const charData = this.getDefaultsFromScene();
		let getFavoritedEncounters = game.settings.get(SFCONSTS.MODULE_NAME, 'favoritedEncounters');

		// Check if there are Favorited Encounters, if so populate them
		if (Object.entries(getFavoritedEncounters).length > 0) {
			getFavoritedEncounters = await SFHelpers.parseEncounter(
				Object.entries(getFavoritedEncounters).map(encounter => encounter[1])
			);
			this.populateEncounters(getFavoritedEncounters);
		}
			

		html.find('button.generate-encounters').on('click', async (event) => {
			event.preventDefault();
			const $button = $(event.currentTarget);

			$button.prop('disabled', true).addClass('disabled');
			$button.find('i.fas').removeClass('fa-dice').addClass('fa-spinner fa-spin');
			const params = {
				loot_type: html.find('#lootType select[name="lootType"]').val(),
				numberOfPlayers: html.find('#numberOfPlayers select[name="numberOfPlayers"]').val(),
				averageLevelOfPlayers: html.find('#averageLevelOfPlayers select[name="averageLevelOfPlayers"]').val(),
				environment: html.find('#environmentSelector select[name="environmentSelector"]').val()
			}
			
			let fetchedData = await SFHelpers.fetchData(params);
			fetchedData = fetchedData.sort((a, b) => {
				const da = SFCONSTS.DIFFICULTY[a.difficulty.replace(" ","")]	
				const db = SFCONSTS.DIFFICULTY[b.difficulty.replace(" ","")]
				if(da > db) return -1;
				if(da < db) return 1;
				return 0;
			});
			const encounterData = await SFHelpers.parseEncounter(fetchedData, params)

			_this.populateEncounters(encounterData);


			$button.prop('disabled', false).removeClass('disabled');
			$button.find('i.fas').removeClass('fa-spinner fa-spin').addClass('fa-dice');
		});

		html.find('.filter-controller select').on('change', function(event) {
			$(event.currentTarget).closest('.form-encounters').attr('data-show', $(event.currentTarget).val());
		});

		html.find('.filter-controller button').on('click', function(event) {
			event.preventDefault();
			$(event.currentTarget).closest('div').find('input').val('').trigger('change');
		});



		// TODO: CLEAN UP CODE
		// show and hide styled inputs, update natural language statement
		html.find('.input-container').click(function() {
			var target = $(this);
			var targetInput = $(this).find('input');
			var targetSelect = $(this).find('select');
			var styledSelect = $(this).find('.newSelect');
			target.addClass('active');
			targetInput.focus();
			targetInput.change(function() {
			var inputValue = $(this).val();
			var placeholder = target.find('.placeholder')
			target.removeClass('active');
			placeholder.html(inputValue);
			});
			targetSelect.change(function() {
			var inputValue = $(this).val();
			var placeholder = target.find('.placeholder')
			target.removeClass('active');
			placeholder.html(inputValue);
			});
			styledSelect.click(function() {
			var target = $(this);
			setTimeout(function() {
				target.parent().parent().removeClass('active');
			}, 10);
			});
		});
		
		// style selects
		
		// Create the new select
		var select = $('.fancy-select');
		select.wrap('<div class="newSelect"></div>');
		html.find('.newSelect').prepend('<div class="newOptions"></div>');
		
		//populate the new select
		select.each(function() {
			var selectOption = $(this).find('option');
			var target = $(this).parent().find('.newOptions');
			selectOption.each(function() {
			var optionContents = $(this).html();
			var optionValue = $(this).attr('value');
			target.append('<div class="newOption" data-value="' + optionValue + '">' + optionContents + '</div>')
			});
		});
		// new select functionality
		var newSelect = html.find('.newSelect');
		var newOption = html.find('.newOption');
		// update based on selection 
		newOption.on('mouseup', function() {
			var OptionInUse = $(this);
			var siblingOptions = $(this).parent().find('.newOption');
			var newValue = $(this).attr('data-value');
			var selectOption = $(this).parent().parent().find('select option');
			// style selected option
			siblingOptions.removeClass('selected');
			OptionInUse.addClass('selected');
			// update the actual input
			selectOption.each(function() {
			var optionValue = $(this).attr('value');
			if (newValue == optionValue) {
				$(this).prop('selected', true);
			} else {
				$(this).prop('selected', false);
			}
			})
		});
		newSelect.click(function() {
			var target = $(this);
			target.parent().find('select').change();
		});
	}

	async _updateObject(event, formData) {

	}
}

Hooks.once('ready', async () => {
	canvas.sfDialog = new SFDialog();
	//canvas.sfDialog.render(true);

	
});

