/**
 * `getConfig`returns singleton instance of the Config class, which is initialized at module-scope
 * when this module is loaded. WARNING: Loading this module may cause an immediate exception, as it
 * parses`process.env` as it is parsed; missing required env keys result in the constructor
 * throwing
 *
 * To test environment loading, use the Config class directly and pass in env objects as you
 * construct instances of it.
 */
import ConfigParser from '../Classes/ConfigParser';

let configInstance: ConfigParser | null = null;

export default function getConfig() {
  if (configInstance) {
    return configInstance.config;
  }

  configInstance = new ConfigParser();

  return configInstance.config;
}
