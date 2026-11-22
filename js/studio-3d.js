function openStudio3DHome() {
    const app = window.app;
    if (!app || document.getElementById('studio-3d-home')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'studio-3d-home';
    dialog.className = 'realistic-3d-library studio-3d-home';
    dialog.setAttribute('aria-labelledby', 'studio-3d-home-title');
    dialog.innerHTML = `<header><h2 id="studio-3d-home-title">3D Studio</h2><button type="button" data-close aria-label="Close">×</button></header>
        <div class="studio-3d-home-content"><h3>Native 3D workspace</h3><p>Build a shared 3D world with objects, furniture, lights, cameras and metre-based transforms.</p><a href="assets/studio3d/index.html">Open Native 3D Workspace →</a><p>The existing editor below retains speech and video tools during migration.</p><h3>Characters, chairs and documents</h3>
        <p>Add Amaka or Tunde, or edit a placed character's appearance, held document, chair and gaze target.</p>
        <div class="realistic-3d-buttons"><button type="button" data-add-character>Add 3D Character</button><button type="button" data-edit-character>Edit Selected Character</button></div>
        <p data-selection-note></p><h3>Teacher &amp; Colleague</h3>
        <p>An editable conversation with two characters, real 3D chairs, a held document, walking, speech and captions.</p>
        <button type="button" data-open-example>Open Teacher &amp; Colleague Example</button>
        <p>Opening the example replaces the current project. Save your work first.</p><output role="status" aria-live="polite"></output></div>`;
    document.body.append(dialog);
    const selected = app.objects.getSelectedObjects().filter(o => o.realistic3D);
    const edit = dialog.querySelector('[data-edit-character]');
    edit.disabled = selected.length !== 1;
    dialog.querySelector('[data-selection-note]').textContent = selected.length === 1
        ? `Selected: ${selected[0].name}` : 'Select one 3D character on the stage to edit its chair, document and gaze.';
    dialog.addEventListener('close', () => dialog.remove(), {once:true});
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.querySelector('[data-add-character]').onclick = () => { dialog.close(); Realistic3DLibrary.open(app); };
    edit.onclick = () => { dialog.close(); Realistic3DLibrary.open(app, selected[0]); };
    dialog.querySelector('[data-open-example]').onclick = async event => {
        if (!window.confirm('Open Teacher & Colleague? This replaces the current project. Save your work first.')) return;
        const button = event.currentTarget, status = dialog.querySelector('output');
        button.disabled = true; status.textContent = 'Loading example…';
        try {
            const url = new URL('assets/examples/teacher-colleague.animstage', document.baseURI);
            if (window.__appAssetVersion) url.searchParams.set('v', window.__appAssetVersion);
            const response = await fetch(url);
            if (!response.ok) throw Error('Example download failed.');
            const data = await response.blob();
            const loaded = await app.exporter._loadProjectFile(new File([data], 'Teacher and Colleague.animstage'), null);
            if (loaded) dialog.close();
            else status.textContent = 'The example was not opened. Please try again.';
        } catch (error) { status.textContent = error.message + ' Please try again.'; }
        finally { button.disabled = false; }
    };
    dialog.showModal();
}
globalThis.Studio3DHome = Object.freeze({open:openStudio3DHome});
document.getElementById('studio-3d-library')?.addEventListener('click', openStudio3DHome);
