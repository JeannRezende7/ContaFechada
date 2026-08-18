package com.contafechada.app;

import androidx.annotation.NonNull;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;
    private String pendingProductId;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    private void withReady(PluginCall call, Runnable action) {
        if (billingClient.isReady()) {
            action.run();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) action.run();
                else call.reject(message(result), String.valueOf(result.getResponseCode()));
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Automatic reconnection is enabled for the next API call.
            }
        });
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        withReady(call, () -> {
            JSObject result = new JSObject();
            result.put("available", true);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.isBlank()) {
            call.reject("productId e obrigatorio");
            return;
        }
        withReady(call, () -> queryProductAndLaunch(call, productId));
    }

    private void queryProductAndLaunch(PluginCall call, String productId) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, detailsResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject(message(billingResult), String.valueOf(billingResult.getResponseCode()));
                return;
            }
            List<ProductDetails> details = detailsResult.getProductDetailsList();
            if (details.isEmpty()) {
                call.reject("Produto Pro nao encontrado na Google Play");
                return;
            }

            BillingFlowParams.ProductDetailsParams.Builder productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details.get(0));
            List<ProductDetails.OneTimePurchaseOfferDetails> offers = details.get(0).getOneTimePurchaseOfferDetailsList();
            if (offers != null && !offers.isEmpty() && offers.get(0).getOfferToken() != null) {
                productParams.setOfferToken(offers.get(0).getOfferToken());
            }
            BillingFlowParams.Builder flow = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(productParams.build()));
            String accountId = call.getString("obfuscatedAccountId");
            if (accountId != null && !accountId.isBlank()) flow.setObfuscatedAccountId(accountId);

            pendingPurchaseCall = call;
            pendingProductId = productId;
            BillingResult launch = billingClient.launchBillingFlow(getActivity(), flow.build());
            if (launch.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                clearPending();
                if (launch.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
                    restoreOwnedProduct(call, productId);
                } else {
                    call.reject(message(launch), String.valueOf(launch.getResponseCode()));
                }
            }
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        String productId = pendingProductId;
        clearPending();
        if (call == null) return;
        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.reject("Compra cancelada", "USER_CANCELED");
            return;
        }
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null || purchases.isEmpty()) {
            call.reject(message(result), String.valueOf(result.getResponseCode()));
            return;
        }
        call.resolve(toJsPurchase(purchases.get(0), productId));
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        withReady(call, () -> billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
            (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(message(result), String.valueOf(result.getResponseCode()));
                    return;
                }
                JSArray items = new JSArray();
                for (Purchase purchase : purchases) items.put(toJsPurchase(purchase, firstProduct(purchase)));
                JSObject response = new JSObject();
                response.put("purchases", items);
                call.resolve(response);
            }
        ));
    }

    private void restoreOwnedProduct(PluginCall call, String productId) {
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
            (result, purchases) -> {
                for (Purchase purchase : purchases) {
                    if (purchase.getProducts().contains(productId)) {
                        call.resolve(toJsPurchase(purchase, productId));
                        return;
                    }
                }
                call.reject("A Google Play informou que o produto ja pertence ao usuario, mas nao retornou a compra.");
            }
        );
    }

    private JSObject toJsPurchase(Purchase purchase, String productId) {
        JSObject result = new JSObject();
        result.put("productId", productId);
        result.put("purchaseToken", purchase.getPurchaseToken());
        result.put("orderId", purchase.getOrderId());
        result.put("acknowledged", purchase.isAcknowledged());
        result.put("purchaseState", purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED ? "purchased" : "pending");
        return result;
    }

    private String firstProduct(Purchase purchase) {
        return purchase.getProducts().isEmpty() ? "" : purchase.getProducts().get(0);
    }

    private void clearPending() {
        pendingPurchaseCall = null;
        pendingProductId = null;
    }

    private String message(BillingResult result) {
        String debug = result.getDebugMessage();
        return debug == null || debug.isBlank() ? "Falha na Google Play" : debug;
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null) billingClient.endConnection();
    }
}
