export interface CloudWebhookPayload {
    object: string;
    entry: CloudEntry[];
}

export interface CloudEntry {
    id: string;
    changes: CloudChange[];
}

export interface CloudChange {
    value: CloudValue;
    field: string;
}

export interface CloudValue {
    messaging_product: string;
    metadata: {
        display_phone_number: string;
        phone_number_id: string;
    };
    contacts?: CloudContact[];
    messages?: CloudMessage[];
    statuses?: CloudStatus[];
    message_template_status_update?: CloudTemplateStatusUpdate;
    message_template_quality_update?: CloudTemplateQualityUpdate;
    template_category_update?: CloudTemplateCategoryUpdate;
    phone_number_quality_update?: CloudPhoneNumberQualityUpdate;
    security_notification?: CloudSecurityNotification;
    account_update?: CloudAccountUpdate;
    call?: CloudCallEvent;
    user_marketing_preferences?: CloudMarketingPreference[];
    
    // Groups API Webhooks
    group_lifecycle_update?: CloudGroupLifecycleUpdate;
    group_participants_update?: CloudGroupParticipantsUpdate;
    group_settings_update?: CloudGroupSettingsUpdate;
    group_status_update?: CloudGroupStatusUpdate;
}

export interface CloudContact {
    profile: {
        name: string;
    };
    wa_id: string;
}

export interface CloudMessage {
    from: string;
    group_id?: string;
    id: string;
    timestamp: string;
    type: CloudMessageType;
    text?: { body: string };
    image?: { id: string; mime_type: string; sha256: string; caption?: string };
    video?: { id: string; mime_type: string; sha256: string; caption?: string };
    audio?: { id: string; mime_type: string; sha256: string; voice?: boolean };
    document?: { id: string; mime_type: string; sha256: string; filename: string; caption?: string };
    location?: { latitude: number; longitude: number; name?: string; address?: string };
    interactive?: {
        type: 'button_reply' | 'list_reply';
        button_reply?: { id: string; title: string };
        list_reply?: { id: string; title: string; description: string };
    };
    order?: {
        catalog_id: string;
        text?: string;
        product_items: { product_retailer_id: string; quantity: string; item_price: string; currency: string }[];
    };
    system?: {
        body: string;
        identity?: string;
        wa_id?: string;
        type?: string;
        customer?: string;
    };
    errors?: unknown[];
    context?: {
        from: string;
        id: string;
    };
}

export type CloudMessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'interactive' | 'button' | 'order' | 'system' | 'unknown' | 'unsupported';

export interface CloudMedia {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
}

export interface CloudStatus {
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed' | 'played';
    timestamp: string;
    recipient_id: string;
    recipient_type?: 'individual' | 'group';
    conversation?: {
        id: string;
        origin: {
            type: string;
        };
    };
    pricing?: {
        billable: boolean;
        pricing_model: string;
        category: string;
        type?: string; // 'regular' | 'free_group_customer_service'
    };
    errors?: unknown[];
}

// --- Group Webhook Interfaces ---

export interface CloudGroupLifecycleUpdate {
    timestamp: string;
    group_id: string;
    type: 'group_create' | 'group_delete';
    request_id?: string;
    subject?: string;
    invite_link?: string;
    join_approval_mode?: string;
    errors?: unknown[];
}

export interface CloudGroupParticipantsUpdate {
    timestamp: string;
    group_id: string;
    type: 'group_participants_add' | 'group_participants_remove' | 'group_join_request_created' | 'group_join_request_revoked';
    reason?: string;
    initiated_by?: 'business' | 'participant';
    join_request_id?: string;
    wa_id?: string; // For join request created/revoked
    added_participants?: { wa_id: string; input?: string }[];
    removed_participants?: { wa_id?: string; input?: string }[];
    failed_participants?: { input: string; errors: unknown[] }[];
    errors?: unknown[];
}

export interface CloudGroupSettingsUpdate {
    timestamp: string;
    group_id: string;
    type: 'group_settings_update';
    request_id?: string;
    profile_picture?: {
        mime_type: string;
        update_successful: boolean;
        sha256?: string;
        errors?: unknown[];
    };
    group_subject?: {
        text: string;
        update_successful: boolean;
        errors?: unknown[];
    };
    group_description?: {
        text: string;
        update_successful: boolean;
        errors?: unknown[];
    };
    errors?: unknown[];
}

export interface CloudGroupStatusUpdate {
    timestamp: string;
    group_id: string;
    type: 'group_suspend' | 'group_suspend_cleared';
}


export interface CloudTemplateStatusUpdate {
    event: string;
    reason?: string;
    message_template_name: string;
    message_template_language: string;
}

export interface CloudTemplateQualityUpdate {
    message_template_id: string;
    message_template_name: string;
    message_template_language: string;
    previous_quality_score: string;
    new_quality_score: string;
}

export interface CloudTemplateCategoryUpdate {
    message_template_name: string;
    message_template_language: string;
    previous_category: string;
    new_category: string;
}

export interface CloudPhoneNumberQualityUpdate {
    display_phone_number: string;
    event: 'FLAGGED' | 'UNFLAGGED';
    current_quality_rating: string;
}

export interface CloudSecurityNotification {
    from: string;
    timestamp: string;
}

export interface CloudAccountUpdate {
    phone_number: string;
    event: 'VERIFIED' | 'UNVERIFIED' | 'BANNED' | 'UNBANNED';
    ban_info?: {
        waba_ban_state: string;
        waba_ban_date: string;
    };
}

export interface CloudCallEvent {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    sdp?: string;
    event?: 'offer' | 'answer' | 'reject' | 'terminate';
}

export interface CloudMarketingPreference {
    wa_id: string;
    timestamp: string;
    marketing_opt_in: boolean;
    last_updated_time: string;
}

export interface CloudSendMessageResponse {
    messaging_product: string;
    contacts: {
        input: string;
        wa_id: string;
    }[];
    messages: {
        id: string;
    }[];
}

export interface CloudMediaResponse {
    url: string;
    mime_type: string;
    sha256: string;
    file_size: number;
    id: string;
    messaging_product: string;
}

export interface CloudMessageBody {
    messaging_product: string;
    to: string;
    recipient_type?: 'individual' | 'group';
    type?: string;
    text?: { body: string };
    image?: { link?: string; id?: string };
    video?: { link?: string; id?: string };
    audio?: { link?: string; id?: string; voice?: boolean };
    sticker?: { link?: string; id?: string };
    location?: { latitude: number; longitude: number; name?: string; address?: string };
    contacts?: {
        addresses?: {
            city?: string;
            country?: string;
            country_code?: string;
            state?: string;
            street?: string;
            type?: string;
            zip?: string;
        }[];
        birthday?: string;
        emails?: {
            email?: string;
            type?: string;
        }[];
        name: {
            formatted_name: string;
            first_name?: string;
            last_name?: string;
            middle_name?: string;
            suffix?: string;
            prefix?: string;
        };
        org?: {
            company?: string;
            department?: string;
            title?: string;
        };
        phones?: {
            phone?: string;
            type?: string;
            wa_id?: string;
        }[];
        urls?: {
            url?: string;
            type?: string;
        }[];
    }[];
    template?: unknown;
    interactive?: unknown;
    reaction?: {
        message_id: string;
        emoji: string;
    };
    context?: { message_id: string };
}

export interface CloudFlowMetricsResponse {
    data: {
        metric: string;
        value: number;
        timestamp: string;
    }[];
}

export interface CloudFlowAssetsResponse {
    data: {
        name: string;
        type: string;
        url: string;
    }[];
}

export interface CloudFlowDeprecateResponse {
    success: boolean;
}

export interface CloudTemplateUpdateResponse {
    success: boolean;
}

export interface CloudTemplatePauseResponse {
    success: boolean;
}

export interface CloudCallPermissionResponse {
    data: {
        user_id: string;
        permission_status: 'allowed' | 'blocked';
    }[];
}

export interface CloudCallSignal {
    call_id: string;
    sdp: string;
    type: 'offer' | 'answer' | 'candidate';
}

// New Response Types for Parity features
export interface CloudCatalogResponse {
    data: {
        id: string;
        name: string;
    }[];
}

export interface CloudCommerceSettingsResponse {
    data: {
        is_cart_enabled: boolean;
        is_catalog_visible: boolean;
    }[];
}

export interface CloudBusinessProfileResponse {
    data: {
        about?: string;
        address?: string;
        description?: string;
        email?: string;
        profile_picture_url?: string;
        websites?: string[];
        vertical?: string;
        messaging_product: string;
    }[];
}

export interface CloudQrListResponse {
    data: {
        code: string;
        prefilled_message: string;
        deep_link_url: string;
        qr_image_url?: string;
    }[];
}

export interface CloudQrResponse {
    data: {
        code: string;
        prefilled_message: string;
        deep_link_url: string;
        qr_image_url?: string;
    }[];
}
