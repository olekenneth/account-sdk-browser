/* Copyright 2018 Schibsted Products & Technology AS. Licensed under the terms of the MIT license.
 * See LICENSE.md in the project root.
 */

'use strict';

import { assert, isNonEmptyString, isUrl, isStr } from './validate';
import { urlMapper } from './url';
import { ENDPOINTS } from './config';
import JSONPClient from './JSONPClient';
import * as popup from './popup';
import RESTClient from './RESTClient';
import * as spidTalk from './spidTalk';

const globalWindow = () => window;

/**
 * Provides features related to payment
 */
export class Payment {
    /**
     * @param {object} options
     * @param {string} options.clientId - Mandatory client id
     * @param {string} [options.redirectUri] - Redirect uri
     * @param {string} [options.env=PRE] - Schibsted Account environment: `PRE`, `PRO` or `PRO_NO`
     * @throws {SDKError} - If any of options are invalid
     */
    constructor({ clientId, redirectUri, env = 'PRE', window = globalWindow() }) {
        spidTalk.emulate(window);
        assert(isNonEmptyString(clientId), 'clientId parameter is required');

        this.clientId = clientId;
        this.redirectUri = redirectUri;
        this.window = window;
        this._setSpidServerUrl(env);
        this._setBffServerUrl(env);
    }

    /**
     * Set SPiD server URL
     * @private
     * @param {string} url - real URL or 'PRE' style key
     * @returns {void}
     */
    _setSpidServerUrl(url) {
        assert(isStr(url), `url parameter is invalid: ${url}`);
        this._spid = new JSONPClient({
            serverUrl: urlMapper(url, ENDPOINTS.SPiD),
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Set BFF server URL - real URL or 'PRE' style key
     * @private
     * @param {string} url
     * @returns {void}
     */
    _setBffServerUrl(url) {
        assert(isStr(url), `url parameter is invalid: ${url}`);
        this._bff = new RESTClient({
            serverUrl: urlMapper(url, ENDPOINTS.BFF),
            defaultParams: { client_id: this.clientId, redirect_uri: this.redirectUri },
        });
    }

    /**
     * Close this.popup if it exists and is open
     * @private
     * @returns {void}
     */
    _closePopup() {
        if (this.popup) {
            if (!this.popup.closed) {
                this.popup.close();
            }
            this.popup = null;
        }
    }

    /**
     * Starts the flow for the paylink in a popup or current window
     * @param {object} options
     * @param {string} options.paylink - The paylink
     * @param {boolean} [options.preferPopup=false] - Should we try to open a popup?
     * @param {string} [options.redirectUri=this.redirectUri]
     * @returns {Window|null} - Returns a reference to the popup window, or `null` if no popup was
     * used
     */
    payWithPaylink({ paylink, preferPopup, redirectUri = this.redirectUri }) {
        assert(isUrl(redirectUri), `payWithPaylink(): redirectUri is invalid`);
        this._closePopup();
        const url = this.purchasePaylinkUrl(paylink, redirectUri);
        if (preferPopup) {
            this.popup =
                popup.open(this.window, url, 'Schibsted Account', { width: 360, height: 570 });
            if (this.popup) {
                return this.popup;
            }
        }
        this.window.location.href = url;
        return null;
    }

    /**
     * Get the url for the end user to review the purchase history
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the purchase history review page
     */
    purchaseHistoryUrl(redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `purchaseHistoryUrl(): redirectUri is invalid`);
        return this._spid.makeUrl('account/purchasehistory', { redirect_uri: redirectUri });
    }

    /**
     * Get the url for the end user to redeem a voucher code
     * @param {string} voucherCode
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url
     */
    redeemUrl(voucherCode, redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `redeemUrl(): redirectUri is invalid`);
        return this._spid.makeUrl('account/redeem', { voucher_code: voucherCode });
    }

    /**
     * Get the url for the paylink purchase
     * @todo Check working-ness for BFF + SPiD
     * @param {string} paylinkId
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the API endpoint
     */
    purchasePaylinkUrl(paylinkId, redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `purchasePaylinkUrl(): redirectUri is invalid`);
        return this._bff.makeUrl('payment/purchase', {
            paylink: paylinkId,
            redirect_uri: redirectUri
        });
    }

    /**
     * Get the url for flow to purchase a product
     * @todo Check working-ness for BFF + SPiD
     * @param {string} productId
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the products review page
     */
    purchaseProductFlowUrl(productId, redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `purchaseProductUrl(): redirectUri is invalid`);
        return this._bff.makeUrl('flow/checkout', {
            response_type: 'code',
            flow: 'payment',
            product_id: productId,
            redirect_uri: redirectUri
        });
    }

    /**
     * Get the url for flow to purchase a product through a campaign and voucher code
     * @todo Check working-ness for BFF + SPiD
     * @param {string} campaignId
     * @param {string} productId
     * @param {string} voucherCode
     * @param {string} [redirectUri=this.redirectUri]
     * @return {string} - The url to the products review page
     */
    purchaseCampaignFlowUrl(campaignId = null, productId = null, voucherCode = null, redirectUri = this.redirectUri) {
        assert(isUrl(redirectUri), `purchaseProductUrl(): redirectUri is invalid`);
        return this._bff.makeUrl('flow/checkout', {
            response_type: 'code',
            flow: 'payment',
            campaign_id: campaignId,
            product_id: productId,
            voucher_code: voucherCode,
            redirect_uri: redirectUri
        });
    }
}

export default Payment;
