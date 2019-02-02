// jQuery plugin: SafeEnter 1.0
// http://plugins.jquery.com/project/SafeEnter
// by teedyay
//
// Fires an event when the user presses Enter, but not whilst they're in the browser's autocomplete suggestions

//codesnippet:2e23681e-c3a9-46ce-be93-48cc3aba2c73
(function($)
{
	$.fn.listenForEnter = function()
	{
		return this.each(function()
		{
			$(this).focus(function()
			{
				$(this).data('safeEnter_InAutocomplete', false);
			});
			$(this).keypress(function(e)
			{
				var key = (e.keyCode ? e.keyCode : e.which);
				switch (key)
				{
					case 13:
						// Fire the event if:
						//   - we're not currently in the browser's Autocomplete, or
						//   - this isn't a textbox, or
						//   - this is Opera (which provides its own protection)
						if (!$(this).data('safeEnter_InAutocomplete') || !$(this).is('input[type=text]') || $.browser.opera)
						{
							$(this).trigger('pressedEnter', e);
						}
						$(this).data('safeEnter_InAutocomplete', false);
						break;

					case 40:
					case 38:
					case 34:
					case 33:
						// down=40,up=38,pgdn=34,pgup=33
						$(this).data('safeEnter_InAutocomplete', true);
						break;

					default:
						$(this).data('safeEnter_InAutocomplete', false);
						break;
				}
			});
		});
	};

	$.fn.clickOnEnter = function(target)
	{
		return this.each(function()
		{
			$(this)
				.listenForEnter()
				.bind('pressedEnter', function()
				{
					$(target).click();
				});
		});
	};
})(jQuery);

