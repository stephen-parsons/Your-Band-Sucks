import {
  AnalyserNode,
  AudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
} from "react-native-audio-api";

export type ActivePlayer = AudioBufferSourceNode & { id: number };

/**
 * Singleton class controlling global audio controls through react-native-audio-api.
 *
 * Provides methods for loading, starting, pausing and stopping audio playback.
 *
 * The audio context must be connected in this order: `sourceNode -> analyzerNode -> audioDestinationNode`
 * as described here: @see https://docs.swmansion.com/react-native-audio-api/docs/core/base-audio-context
 *
 * @see {AudioContext}
 */
class AudioProvider {
  public audioContext;
  public playerNode: ActivePlayer | null;
  public audioBuffer: AudioBuffer | null;
  public currentPosition: number;
  private onPositionChangedCallback: (value: number) => void;
  public analyzer: AnalyserNode | null = null;
  public id: number | null = null;
  //Local memory cache for storing pre-loaded buffers
  private audioBufferMap = new Map<number, AudioBuffer>();
  constructor() {
    this.audioContext = new AudioContext();
    this.playerNode = null;
    this.audioBuffer = null;
    this.currentPosition = 0;
    this.onPositionChangedCallback = () => {};
  }

  /**
   * Downloads an audio buffer into memory from a remote url
   * Sets the audio buffer into the `audioBufferMap`
   * @param id uniqie for the audio buffer
   * @param url remote url to download buffer
   * @returns the audio buffer
   */
  public async preloadAudioBuffer(id: number, url: string) {
    console.info(`Preloading audio buffer by id: ${id}`);
    const audioBuffer = await this.audioContext.decodeAudioData(url);
    this.audioBufferMap.set(id, audioBuffer);
    return audioBuffer;
  }

  /**
   * Either retrieves buffer from cache or loads from remote url and caches after.
   * @param id id for AudioBuffer
   * @param url remote url for AudioBuffer
   */
  private async getAudioBuffer(id: number, url: string) {
    let buffer = this.audioBufferMap.get(id);
    if (!buffer) buffer = await this.preloadAudioBuffer(id, url);
    return buffer;
  }

  public pause() {
    if (!this.playerNode) return;
    this.playerNode?.stop();
    this.audioContext.suspend();
  }

  public stop() {
    if (!this.playerNode) return;
    this.playerNode?.stop();
    this.playerNode?.disconnect();
    this.audioContext.close();
  }

  public resume(id: number, newTime?: number) {
    this.createBufferSourceNode(id);
    //update position for playback
    if (newTime) this.currentPosition = newTime;
    this.audioContext.resume();
    this.playerNode?.start(0, this.currentPosition);
  }

  public start(id: number) {
    this.createBufferSourceNode(id);
    this.playerNode?.start();
  }

  public updatePosition(position: number) {
    this.currentPosition = position;
  }

  /**
   * Sets the active player by updating the `audioBuffer` and `onPositionChangedCallback`
   * @param id id for AudioBuffer
   * @param url remote url for AudioBuffer
   * @param onPositionChangedCallback
   * @returns void
   */
  public async setActivePlayer(
    id: number,
    url: string,
    onPositionChangedCallback: (value: number) => void,
  ) {
    if (this.playerNode?.id === id) {
      console.warn("Player already set with id: ", this.playerNode?.id);
      return;
    }
    try {
      if (this.playerNode) this.clearActivePlayer();
      this.audioBuffer = await this.getAudioBuffer(id, url);
      this.onPositionChangedCallback = onPositionChangedCallback;
    } catch (e) {
      console.error(`Error setting new active player: ${e}`);
      throw e;
    }
  }

  /**
   * Create a new buffer source node, `this.playerNode`
   * This must be done every time an audio source is started or resumed
   * @param id id for AudioBuffer
   */
  private createBufferSourceNode(id: number) {
    //Create a new source node, this is the first node in the chain and provides the audio source
    const playerNode = this.audioContext.createBufferSource();
    //Set the buffer on the source node
    playerNode.buffer = this.audioBuffer;
    //Connect the source node to the analyzer for visualizations
    playerNode.connect(this.createAnalyser());
    //Update the position changed callback for the new audio source
    playerNode.onPositionChanged = (ev) => {
      this.currentPosition = ev.value;
      this.onPositionChangedCallback(ev.value);
    };
    playerNode.onPositionChangedInterval = 100;
    (playerNode as ActivePlayer).id = id;
    this.playerNode = playerNode as ActivePlayer;
  }

  public clearActivePlayer() {
    console.info("Clearing active player... ", this.playerNode?.id);
    this.stop();
    this.playerNode = null;
    this.analyzer = null;
    this.audioBuffer = null;
  }

  /**
   * Creates a new analyzer node
   * @returns a new analyzer node
   */
  private createAnalyser() {
    const analyzer = this.audioContext.createAnalyser();
    analyzer.fftSize = 512;
    analyzer.smoothingTimeConstant = 0.8;
    analyzer.connect(this.audioContext.destination);
    this.analyzer = analyzer;
    return analyzer;
  }

  public hasAudioBuffer(id: number) {
    return this.audioBufferMap.has(id);
  }
}

export default new AudioProvider();
