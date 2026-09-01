/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect } from 'react';
import { createLogger } from '@/lib/logger';
import {
    type EmbeddedMessagingConfig,
    type EmbeddedMessagingHiddenFields,
    flushPendingEmbeddedMessagingOpen,
    validateEmbeddedMessagingConfig,
} from './embedded-messaging.utils';

const logger = createLogger();

interface EmbeddedMessagingUIProps {
    config: EmbeddedMessagingConfig;
    hiddenFields?: EmbeddedMessagingHiddenFields;
}

const SCRIPT_ID = 'embedded-messaging-bootstrap';

/**
 * Injects and initializes the Salesforce Embedded Messaging bootstrap script. Only mounted
 * once the parent has decided to load this chunk (idle or on-demand — see index.tsx).
 */
function EmbeddedMessagingUI({ config, hiddenFields }: EmbeddedMessagingUIProps) {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!validateEmbeddedMessagingConfig(config)) return;
        if (document.getElementById(SCRIPT_ID)) return;

        const handleReady = (): void => {
            if (hiddenFields && Object.keys(hiddenFields).length) {
                try {
                    window.embeddedservice_bootstrap?.prechatAPI?.setHiddenPrechatFields?.(hiddenFields);
                } catch (error) {
                    logger.error('Error setting embedded messaging hidden fields', { error });
                }
            }
            flushPendingEmbeddedMessagingOpen();
        };
        window.addEventListener('onEmbeddedMessagingReady', handleReady);

        const initEmbeddedMessaging = (): void => {
            try {
                if (config.language) {
                    window.embeddedservice_bootstrap!.settings.language = config.language;
                }
                window.embeddedservice_bootstrap!.init(config.orgId, config.esDeveloperName, config.siteUrl, {
                    scrt2URL: config.scrt2Url,
                });
            } catch (error) {
                logger.error('Error initializing embedded messaging', { error });
            }
        };

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = config.bootstrapScriptUrl;
        script.onload = initEmbeddedMessaging;
        script.onerror = () => logger.error('Failed to load embedded messaging bootstrap script');
        document.body.appendChild(script);

        return () => {
            window.removeEventListener('onEmbeddedMessagingReady', handleReady);
        };
        // Intentionally run once: the bootstrap script is not designed to be re-initialized
        // on config change within a session.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

export default EmbeddedMessagingUI;
