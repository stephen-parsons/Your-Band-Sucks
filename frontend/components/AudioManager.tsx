import {
  AudioBuffer,
  AudioBufferQueueSourceNode,
  AudioContext,
} from "react-native-audio-api";

export type ActivePlayer = AudioBufferQueueSourceNode & { id: number };

class AudioProvider {
  public audioContext;
  public playerNode: ActivePlayer | null;
  public audioBuffer: AudioBuffer | null;
  constructor() {
    this.audioContext = new AudioContext();
    this.playerNode = null;
    this.audioBuffer = null;
  }

  public pause() {
    this.playerNode?.pause();
    this.audioContext.suspend();
  }

  public resume(newTime?: number) {
    this.audioContext.resume();
    this.playerNode?.start(0, newTime);
  }

  public start() {
    this.playerNode?.start();
  }

  public async setActivePlayer(id: number, url: string) {
    if (this.playerNode?.id === id) {
      console.warn("Player already set with id: " + this.playerNode?.id);
      return;
    }
    try {
      if (this.playerNode) this.clearActivePlayer();
      const audioBuffer = await this.audioContext.decodeAudioData(url);
      this.audioBuffer = audioBuffer;
      const playerNode = this.audioContext.createBufferQueueSource();
      playerNode.enqueueBuffer(audioBuffer);
      playerNode.connect(this.audioContext.destination);
      (playerNode as ActivePlayer).id = id;
      this.playerNode = playerNode as ActivePlayer;
    } catch (e) {
      console.warn("Error seeting new active player:", e);
      throw e;
    }
  }

  public clearActivePlayer() {
    console.log("clear active player");
    this.playerNode = null;
  }
}

export default new AudioProvider();
