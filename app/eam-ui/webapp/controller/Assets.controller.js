sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "eam/ui/model/formatter",
    "eam/ui/model/CrudHelper",
    "sap/ui/model/Sorter"
], function (Controller, Fragment, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, formatter, CrudHelper,Sorter) {
    "use strict";

    // Decimal(10,2): up to 8 integer digits and 2 decimals
    var PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

    return Controller.extend("eam.ui.controller.Assets", {

        formatter: formatter,

        onInit: function () {
            this.getView().setModel(new JSONModel({ count: 0 }), "view");
            this._sQuery = "";
            this._sStatus = "ALL";
            this._sType = "ALL";
            this._sSort = "NAME_ASC";
        },

        /* ---------- Search & filter ---------- */

        onSearch: function (oEvent) {
            this._sQuery = (oEvent.getParameter("query") || "").trim();
            this._applyFilters();
        },

        onStatusChange: function (oEvent) {
            this._sStatus = oEvent.getParameter("selectedItem").getKey();
            this._applyFilters();
        },

        onTypeChange: function (oEvent) {
            this._sType = oEvent.getParameter("selectedItem").getKey();
            this._applyFilters();
        },

        onSortChange: function (oEvent) {
            this._sSort = oEvent.getParameter("selectedItem").getKey();
            this._applySort();
        },

        _applySort: function () {
            var mSorters = {
                NAME_ASC:   new Sorter("AssetName", false),
                NAME_DESC:  new Sorter("AssetName", true),
                PRICE_DESC: new Sorter("Price", true),
                PRICE_ASC:  new Sorter("Price", false),
                DATE_DESC:  new Sorter("PurchaseDate", true)
            };

            this.byId("assetsTable").getBinding("items").sort(mSorters[this._sSort]);
        },

        _applyFilters: function () {
            var aFilters = [];

            if (this._sQuery) {
                aFilters.push(new Filter({
                    and: false,
                    filters: [
                        new Filter("AssetName", FilterOperator.Contains, this._sQuery),
                        new Filter("AssetType", FilterOperator.Contains, this._sQuery),
                        new Filter("SerialNumber", FilterOperator.Contains, this._sQuery)
                    ]
                }));
            }

            if (this._sStatus !== "ALL") {
                aFilters.push(new Filter("Status", FilterOperator.EQ, this._sStatus));
            }

            if (this._sType !== "ALL") {
                aFilters.push(new Filter("AssetType", FilterOperator.EQ, this._sType));
            }

            var vFilter = aFilters.length
                ? new Filter({ filters: aFilters, and: true })
                : [];

            this.byId("assetsTable").getBinding("items").filter(vFilter);
        },

        onUpdateFinished: function (oEvent) {
            var iTotal = oEvent.getParameter("total");
            if (typeof iTotal === "number" && iTotal >= 0) {
                this.getView().getModel("view").setProperty("/count", iTotal);
            }
        },

        onItemPress: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext().getProperty("ID");

            this.getOwnerComponent().getRouter().navTo("assetDetail", {
                assetId: sId
            });
        },

        /* ---------- Create / edit ---------- */

        onAddPress: function () {
            this._openDialog(null);
        },

        onEditPress: function (oEvent) {
            this._openDialog(oEvent.getSource().getBindingContext());
        },

        _openDialog: function (oContext) {
            var oView = this.getView();

            if (this._oDialog || this._bOpening) {
                return;
            }
            this._bOpening = true;

            var bEdit = !!oContext;
            var fnGet = function (sName) {
                var vValue = bEdit ? oContext.getProperty(sName) : "";
                return vValue === null || vValue === undefined ? "" : String(vValue);
            };

            this._oEditContext = oContext;
            this._oDialogModel = new JSONModel({
                title: bEdit ? "Edit Asset" : "Add Asset",
                confirmText: bEdit ? "Save" : "Add",
                AssetName: fnGet("AssetName"),
                AssetType: fnGet("AssetType"),
                SerialNumber: fnGet("SerialNumber"),
                PurchaseDate: fnGet("PurchaseDate"),
                Price: fnGet("Price"),
                Status: bEdit ? fnGet("Status") : "AVAILABLE",
                statusLocked: bEdit && fnGet("Status") === "ASSIGNED",
                state: {
                    AssetName: "None",
                    AssetType: "None",
                    SerialNumber: "None",
                    Price: "None"
                }
            });

            Fragment.load({
                id: oView.getId(),
                name: "eam.ui.view.fragment.AssetDialog",
                controller: this
            }).then(function (oDialog) {
                this._oDialog = oDialog;
                this._bOpening = false;

                oDialog.setModel(this._oDialogModel, "asset");
                oView.addDependent(oDialog);
                oDialog.attachAfterClose(function () {
                    oDialog.destroy();
                    this._oDialog = null;
                }.bind(this));
                oDialog.open();
            }.bind(this));
        },

        onFieldChange: function (oEvent) {
            var sPath = oEvent.getSource().getBinding("value").getPath();
            this._oDialogModel.setProperty("/state" + sPath, "None");
        },

        onCancelAsset: function () {
            this._oDialog.close();
        },

        onSaveAsset: function () {
            var oData = this._oDialogModel.getData();
            var sPrice = (oData.Price || "").trim();

            var mAsset = {
                AssetName: (oData.AssetName || "").trim(),
                AssetType: (oData.AssetType || "").trim(),
                SerialNumber: (oData.SerialNumber || "").trim(),
                PurchaseDate: oData.PurchaseDate || null,
                Price: sPrice ? Number(sPrice).toFixed(2) : null,
                Status: oData.Status
            };

            var mState = {
                AssetName: mAsset.AssetName ? "None" : "Error",
                AssetType: mAsset.AssetType ? "None" : "Error",
                SerialNumber: mAsset.SerialNumber ? "None" : "Error",
                Price: (!sPrice || PRICE_PATTERN.test(sPrice)) ? "None" : "Error"
            };
            this._oDialogModel.setProperty("/state", mState);

            if (Object.keys(mState).some(function (sKey) { return mState[sKey] === "Error"; })) {
                return;
            }

            var bEdit = !!this._oEditContext;
            var oBinding = this.byId("assetsTable").getBinding("items");
            var pSave = bEdit
                ? CrudHelper.update(this._oEditContext, mAsset)
                : CrudHelper.create(oBinding, mAsset);

            this._oDialog.setBusy(true);

            pSave.then(function () {
                this._oDialog.close();
                MessageToast.show(bEdit ? "Asset updated" : "Asset added");
                oBinding.refresh();
            }.bind(this)).catch(function (oError) {
                this._oDialog.setBusy(false);
                MessageBox.error(
                    (oError && oError.message) ||
                    "The asset could not be saved. Please try again."
                );
            }.bind(this));
        },

        /* ---------- Delete ---------- */

        onDeletePress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oTable = this.byId("assetsTable");
            var sName = oContext.getProperty("AssetName");

            CrudHelper.confirmDelete(
                "Delete asset",
                "Delete " + sName + "? This cannot be undone."
            ).then(function (bConfirmed) {
                if (!bConfirmed) {
                    return;
                }

                oTable.setBusy(true);

                oContext.delete().then(function () {
                    oTable.setBusy(false);
                    MessageToast.show("Asset deleted");
                }, function (oError) {
                    oTable.setBusy(false);
                    MessageBox.error(
                        (oError && oError.message) ||
                        "The asset could not be deleted."
                    );
                });
            });
        }

    });
});