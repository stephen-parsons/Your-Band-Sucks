import {
  AudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
} from "react-native-audio-api";

export type ActivePlayer = AudioBufferSourceNode & { id: number };

class AudioProvider {
  public audioContext;
  public playerNode: ActivePlayer | null;
  public audioBuffer: AudioBuffer | null;
  public currentPosition: number;
  private onPositionChangedCallback: (value: number) => void;
  constructor() {
    this.audioContext = new AudioContext();
    this.playerNode = null;
    this.audioBuffer = null;
    this.currentPosition = 0;
    this.onPositionChangedCallback = () => {};
  }

  public pause() {
    this.playerNode?.stop();
    this.audioContext.suspend();
  }

  public resume(id: number, newTime?: number) {
    this.createBufferSourceNode(id);
    this.audioContext.resume();
    this.playerNode?.start(0, newTime || this.currentPosition);
    if (newTime) this.currentPosition = newTime;
  }

  public start() {
    this.playerNode?.start();
  }

  public updatePosition(position: number) {
    this.currentPosition = position;
  }

  public async setActivePlayer(
    id: number,
    url: string,
    onPositionChangedCallback: (value: number) => void,
  ) {
    if (this.playerNode?.id === id) {
      console.warn("Player already set with id: " + this.playerNode?.id);
      return;
    }
    try {
      if (this.playerNode) this.clearActivePlayer();
      const audioBuffer = await this.audioContext.decodeAudioData(url);
      this.audioBuffer = audioBuffer;
      this.onPositionChangedCallback = onPositionChangedCallback;
      this.createBufferSourceNode(id);
    } catch (e) {
      console.warn("Error setting new active player:", e);
      throw e;
    }
  }

  private createBufferSourceNode(id: number) {
    const playerNode = this.audioContext.createBufferSource();
    playerNode.buffer = this.audioBuffer;
    playerNode.connect(this.audioContext.destination);
    playerNode.onPositionChanged = (ev) => {
      this.currentPosition = ev.value;
    };
    playerNode.onPositionChangedInterval = 100;
    (playerNode as ActivePlayer).id = id;
    this.playerNode = playerNode as ActivePlayer;
  }

  public clearActivePlayer() {
    console.log("clear active player");
    this.playerNode = null;
  }
}

export default new AudioProvider();
