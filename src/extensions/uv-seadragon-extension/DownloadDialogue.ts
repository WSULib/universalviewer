import BaseCommands = require("../../modules/uv-shared-module/BaseCommands");
import BaseDownloadDialogue = require("../../modules/uv-dialogues-module/DownloadDialogue");
import DownloadOption = require("../../modules/uv-shared-module/DownloadOption");
import ISeadragonExtension = require("./ISeadragonExtension");
import ISeadragonProvider = require("./ISeadragonProvider");

class DownloadDialogue extends BaseDownloadDialogue {

    $buttonsContainer: JQuery;
    $currentViewAsJpgButton: JQuery;
    $downloadButton: JQuery;
    $pagingNote: JQuery;
    $settingsButton: JQuery;
    $wholeImageHighResButton: JQuery;
    $wholeImageLowResAsJpgButton: JQuery;
    renderingUrls: string[];
    renderingUrlsCount: number;

    constructor($element: JQuery) {
        super($element);
    }

    create(): void {

        this.setConfig('downloadDialogue');

        super.create();

        // create ui.
        this.$settingsButton = $('<a class="settings" href="#">' + this.content.editSettings + '</a>');
        this.$pagingNote = $('<div class="pagingNote">' + this.content.pagingNote + ' </div>');
        this.$pagingNote.append(this.$settingsButton);
        this.$content.append(this.$pagingNote);

        this.$currentViewAsJpgButton = $('<li><input id="' + DownloadOption.currentViewAsJpg.toString() + '" type="radio" name="downloadOptions" /><label for="' + DownloadOption.currentViewAsJpg.toString() + '">' + this.content.currentViewAsJpg + '</label></li>');
        this.$downloadOptions.append(this.$currentViewAsJpgButton);
        this.$currentViewAsJpgButton.hide();

        this.$wholeImageHighResButton = $('<li><input id="' + DownloadOption.wholeImageHighRes.toString() + '" type="radio" name="downloadOptions" /><label id="' + DownloadOption.wholeImageHighRes.toString() + 'label" for="' + DownloadOption.wholeImageHighRes.toString() + '"></label></li>');
        this.$downloadOptions.append(this.$wholeImageHighResButton);
        this.$wholeImageHighResButton.hide();

        this.$wholeImageLowResAsJpgButton = $('<li><input id="' + DownloadOption.wholeImageLowResAsJpg.toString() + '" type="radio" name="downloadOptions" /><label for="' + DownloadOption.wholeImageLowResAsJpg.toString() + '">' + this.content.wholeImageLowResAsJpg + '</label></li>');
        this.$downloadOptions.append(this.$wholeImageLowResAsJpgButton);
        this.$wholeImageLowResAsJpgButton.hide();

        this.$buttonsContainer = $('<div class="buttons"></div>');
        this.$content.append(this.$buttonsContainer);

        this.$downloadButton = $('<a class="btn btn-primary" href="#">' + this.content.download + '</a>');
        this.$buttonsContainer.append(this.$downloadButton);

        var that = this;

        this.$downloadButton.on('click', (e) => {
            e.preventDefault();

            var selectedOption = that.getSelectedOption();

            var id: string = selectedOption.attr('id');
            var canvas = this.provider.getCurrentCanvas();

            if (this.renderingUrls[id]) {
                window.open(this.renderingUrls[id]);
            } else {
                switch (id){
                    case DownloadOption.currentViewAsJpg.toString():
                        var viewer = (<ISeadragonExtension>that.extension).getViewer();
                        window.open((<ISeadragonProvider>that.provider).getCroppedImageUri(canvas, viewer, true));
                        break;
                    case DownloadOption.wholeImageHighRes.toString():
                        window.open(this.getOriginalImageForCurrentCanvas());
                        break;
                    case DownloadOption.wholeImageLowResAsJpg.toString():
                        window.open((<ISeadragonProvider>that.provider).getConfinedImageUri(canvas, that.options.confinedImageSize));
                        break;
                }
            }

            $.publish(BaseCommands.DOWNLOAD, [id]);

            this.close();
        });

        this.$settingsButton.onPressed(() => {
            this.close();
            $.publish(BaseCommands.SHOW_SETTINGS_DIALOGUE);
        });
    }

    open() {
        super.open();

        if (this.isDownloadOptionAvailable(DownloadOption.currentViewAsJpg)) {
            this.$currentViewAsJpgButton.show();
        } else {
            this.$currentViewAsJpgButton.hide();
        }

        if (this.isDownloadOptionAvailable(DownloadOption.wholeImageHighRes)) {
            var mime = this.getMimeTypeForCurrentCanvas();
            var label = String.format(this.content.wholeImageHighRes, this.simplifyMimeType(mime));
            $('#' + DownloadOption.wholeImageHighRes.toString() + 'label').text(label);
            this.$wholeImageHighResButton.show();
        } else {
            this.$wholeImageHighResButton.hide();
        }

        if (this.isDownloadOptionAvailable(DownloadOption.wholeImageLowResAsJpg)) {
            this.$wholeImageLowResAsJpgButton.show();
        } else {
            this.$wholeImageLowResAsJpgButton.hide();
        }

        this.resetDynamicDownloadOptions();
        var currentCanvas: Manifesto.ICanvas = this.provider.getCurrentCanvas();
        if (this.isDownloadOptionAvailable(DownloadOption.dynamicImageRenderings)) {
            // todo: use canvas.getImages() when available
            for (var i = 0; i < currentCanvas.__jsonld.images.length; i++) {
                this.addDownloadOptionsForRenderings(currentCanvas.__jsonld.images[i], this.content.entireFileAsOriginal);
            }
        }
        if (this.isDownloadOptionAvailable(DownloadOption.dynamicCanvasRenderings)) {
            this.addDownloadOptionsForRenderings(currentCanvas, this.content.entireFileAsOriginal);
        }
        if (this.isDownloadOptionAvailable(DownloadOption.dynamicSequenceRenderings)) {
            this.addDownloadOptionsForRenderings(this.provider.getCurrentSequence(), this.content.entireDocument);
        }

        if (!this.$downloadOptions.find('li:visible').length){
            this.$noneAvailable.show();
            this.$downloadButton.hide();
        } else {
            // select first option.
            this.$downloadOptions.find('input:visible:first').prop("checked", true);
            this.$noneAvailable.hide();
            this.$downloadButton.show();
        }

        if (this.provider.isPagingSettingEnabled()) {
            this.$pagingNote.show();
        } else {
            this.$pagingNote.hide();
        }

        this.resize();
    }

    resetDynamicDownloadOptions()
    {
        this.renderingUrls = [];
        this.renderingUrlsCount = 0;
        this.$downloadOptions.find('.dynamic').remove();
    }

    addDownloadOptionsForRenderings(resource: Manifesto.IManifestResource, defaultLabel: string)
    {
        var renderings: Manifesto.IRendering[] = manifesto.getRenderings(resource);

        for (var i = 0; i < renderings.length; i++) {
            var rendering: Manifesto.IRendering = renderings[i];
            if (rendering) {
                var label = rendering.getLabel();
                if (label) {
                    label += " ({0})";
                } else {
                    label = defaultLabel;
                }
                label = String.format(label, this.simplifyMimeType(rendering.getFormat().toString()));
                var currentId = "dynamic_download_" + ++this.renderingUrlsCount;
                this.renderingUrls[currentId] = rendering.id;
                var newButton = $('<li class="dynamic"><input id="' + currentId + '" type="radio" name="downloadOptions" /><label for="' + currentId + '">' + label + '</label></li>');
                this.$downloadOptions.append(newButton);
            }
        }
    }

    getSelectedOption() {
        return this.$downloadOptions.find("input:checked");
    }

    getOriginalImageForCurrentCanvas() {
        var canvas: Manifesto.ICanvas = this.provider.getCurrentCanvas();
        // todo: use canvas.getImages() when available
        if (canvas.__jsonld['images'][0]['resource']['@id']) {
            return canvas.__jsonld['images'][0]['resource']['@id'];
        }
        return false;
    }

    getMimeTypeForCurrentCanvas() {
        var canvas: Manifesto.ICanvas = this.provider.getCurrentCanvas();
        // todo: use canvas.getImages() when available
        if (canvas.__jsonld['images'][0]['resource']['format']) {
            return canvas.__jsonld['images'][0]['resource']['format'];
        }
        return false;
    }

    getDimensionsForCurrentCanvas() {
        var canvas: Manifesto.ICanvas = this.provider.getCurrentCanvas();
        // todo: use canvas.getImages() when available
        if (canvas.__jsonld['images'][0]['resource']['width'] && canvas.__jsonld['images'][0]['resource']['height']) {
            return [canvas.__jsonld['images'][0]['resource']['width'], canvas.__jsonld['images'][0]['resource']['height']];
        }
        return [0, 0];
    }

    isDownloadOptionAvailable(option: DownloadOption): boolean {
        switch (option){
            case DownloadOption.currentViewAsJpg:
            case DownloadOption.dynamicCanvasRenderings:
            case DownloadOption.dynamicImageRenderings:
            case DownloadOption.wholeImageHighRes:
                return this.provider.isPagingSettingEnabled() ? false : true;
            case DownloadOption.wholeImageLowResAsJpg:
                // hide low-res option if hi-res width is smaller than constraint
                var dimensions = this.getDimensionsForCurrentCanvas();
                return (!this.provider.isPagingSettingEnabled() && (dimensions[0] > this.options.confinedImageSize))
            default:
                return true;
        }
    }
}

export = DownloadDialogue;