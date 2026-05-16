import { logger } from "../logger";
import type { BaseWorker } from "./base-worker";
import { DomainSniperWorker } from "./domain-sniper";
import { FragmentHunterWorker } from "./fragment-hunter";
import { SocialSnatcherWorker } from "./social-snatcher";
import { AirdropFarmerWorker } from "./airdrop-farmer";
import { DepinOrchestratorWorker } from "./depin-orchestrator";
import { MemecoinSniperWorker } from "./memecoin-sniper";
import { QuantumSquatterWorker } from "./quantum-squatter";
import { ComputeBrokerWorker } from "./compute-broker";
import { SatoshiScannerWorker } from "./satoshi-scanner";
import { DaoBribeBotWorker } from "./dao-bribe-bot";
import { AiInferenceManagerWorker } from "./ai-inference-manager";
import { RwaFloorSniperWorker } from "./rwa-floor-sniper";

/**
 * Central registry — single source of truth for all 12 Codicore workers.
 * The orchestrator owns lifecycle; routes/news/UI all read from here.
 */
class WorkerRegistry {
  private workers = new Map<string, BaseWorker>();
  private initialized = false;

  constructor() {
    this.register(new DomainSniperWorker());
    this.register(new FragmentHunterWorker());
    this.register(new SocialSnatcherWorker());
    this.register(new AirdropFarmerWorker());
    this.register(new DepinOrchestratorWorker());
    this.register(new MemecoinSniperWorker());
    this.register(new QuantumSquatterWorker());
    this.register(new ComputeBrokerWorker());
    this.register(new SatoshiScannerWorker());
    this.register(new DaoBribeBotWorker());
    this.register(new AiInferenceManagerWorker());
    this.register(new RwaFloorSniperWorker());
  }

  private register(w: BaseWorker): void {
    this.workers.set(w.def.id, w);
  }

  all(): BaseWorker[] {
    return Array.from(this.workers.values());
  }

  get(id: string): BaseWorker | undefined {
    return this.workers.get(id);
  }

  /** Persist every worker definition to the DB on first boot. */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    for (const w of this.workers.values()) {
      try {
        await w.register();
      } catch (err) {
        logger.error({ worker: w.def.id, err }, "Worker registration failed");
      }
    }
    logger.info({ count: this.workers.size }, "Worker registry initialized");
  }
}

export const workerRegistry = new WorkerRegistry();
