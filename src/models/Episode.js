export class Episode {
  constructor(title, scenes = []) {
    this.title = title;
    this.scenes = scenes;
  }

  addScene(scene) {
    this.scenes.push(scene);
  }

  getSceneCount() {
    return this.scenes.length;
  }

  toJSON() {
    return {
      title: this.title,
      scenes: this.scenes
    };
  }
}

export class Scene {
  constructor(sceneId, description, dialogue) {
    this.scene_id = sceneId;
    this.description = description;
    this.dialogue = dialogue;
    this.image_prompt = null;
    this.voiceover_script = null;
  }

  setImagePrompt(prompt) {
    this.image_prompt = prompt;
  }

  setVoiceoverScript(script) {
    this.voiceover_script = script;
  }

  toJSON() {
    return {
      scene_id: this.scene_id,
      description: this.description,
      dialogue: this.dialogue,
      image_prompt: this.image_prompt,
      voiceover_script: this.voiceover_script
    };
  }
}