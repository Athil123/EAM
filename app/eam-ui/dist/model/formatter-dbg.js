sap.ui.define([], function () {
    "use strict";

    return {

        assetState: function (sStatus) {
            switch (sStatus) {
                case "AVAILABLE": return "Success";
                case "ASSIGNED":  return "Information";
                case "REPAIR":    return "Warning";
                default:          return "None";
            }
        },

        assignmentState: function (sStatus) {
            switch (sStatus) {
                case "ASSIGNED": return "Information";
                case "RETURNED": return "Success";
                default:         return "None";
            }
        },

        initials: function (sFirst, sLast) {
            return ((sFirst || "").charAt(0) + (sLast || "").charAt(0)).toUpperCase();
        },

        percentOfMax: function (iValue, iMax) {
            return iMax ? Math.round((iValue || 0) * 100 / iMax) : 0;
        }

    };
});