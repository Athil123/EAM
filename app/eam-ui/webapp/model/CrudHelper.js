sap.ui.define([
    "sap/m/MessageBox"
], function (MessageBox) {
    "use strict";

    function asText(vValue) {
        return vValue === null || vValue === undefined ? null : String(vValue);
    }

    return {

        /**
         * Creates a row through a list binding and resolves when the
         * server has answered. Rejects with the server error.
         */
        create: function (oListBinding, mData) {
            var oContext = oListBinding.create(mData);

            return new Promise(function (resolve, reject) {
                var fnCompleted = function (oEvent) {
                    if (oEvent.getParameter("context") !== oContext) {
                        return;
                    }
                    oListBinding.detachCreateCompleted(fnCompleted);

                    if (oEvent.getParameter("success")) {
                        resolve();
                    } else {
                        // Drop the failed transient row so the list stays clean
                        oContext.delete().catch(function () { /* already gone */ });
                        reject(new Error("Create failed"));
                    }
                };
                oListBinding.attachCreateCompleted(fnCompleted);
            });
        },

        /**
         * Sends a PATCH for every property that actually changed.
         * On failure the pending changes are reset and the error is re-thrown.
         */
        update: function (oContext, mData) {
            var aUpdates = Object.keys(mData)
                .filter(function (sName) {
                    return asText(oContext.getProperty(sName)) !== asText(mData[sName]);
                })
                .map(function (sName) {
                    return oContext.setProperty(sName, mData[sName]);
                });

            return Promise.all(aUpdates).catch(function (oError) {
                oContext.getBinding().resetChanges();
                throw oError;
            });
        },

        /**
         * Shows a delete confirmation. Resolves true if confirmed.
         */
        confirmDelete: function (sTitle, sText) {
            return new Promise(function (resolve) {
                MessageBox.warning(sText, {
                    title: sTitle,
                    actions: ["Delete", MessageBox.Action.CANCEL],
                    emphasizedAction: "Delete",
                    onClose: function (sAction) {
                        resolve(sAction === "Delete");
                    }
                });
            });
        }

    };
});